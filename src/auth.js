import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'change-me-in-production') {
    console.error('FATAL: JWT_SECRET is not set or is the default value. Set JWT_SECRET env var.');
    process.exit(1);
}
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

// ── Permission cache (per request, cleared on restart) ─────────────────
const permissionCache = new Map();

export function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

export function generateToken(user, expiry = ACCESS_EXPIRY) {
    return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: expiry });
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

// ── RBAC: Get role permissions ────────────────────────────────────────
export function getRolePermissions(roleName) {
    const cacheKey = `role:${roleName}`;
    if (permissionCache.has(cacheKey)) return permissionCache.get(cacheKey);
    
    const role = db.prepareGetRoleByName.get(roleName);
    if (!role) return [];
    
    const permissions = JSON.parse(role.permissions || '[]');
    permissionCache.set(cacheKey, permissions);
    return permissions;
}

// ── RBAC: Check if permission exists ──────────────────────────────────
export function hasPermission(roleName, requiredPermission) {
    if (roleName === 'superadmin') return true; // superadmin bypasses all
    
    const permissions = getRolePermissions(roleName);
    
    return permissions.some(p => {
        // Exact match
        if (p === requiredPermission) return true;
        // Wildcard match (e.g., 'sessions:*' matches 'sessions:read')
        if (p.endsWith(':*')) {
            const prefix = p.slice(0, -2);
            return requiredPermission.startsWith(prefix + ':');
        }
        // Global wildcard
        if (p === '*') return true;
        return false;
    });
}

// ── RBAC: Middleware — require specific permission(s) ──────────────────
export function requirePermission(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        
        const roleName = req.user.role || 'viewer';
        
        const hasAll = requiredPermissions.every(p => hasPermission(roleName, p));
        
        if (!hasAll) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                required: requiredPermissions,
                role: roleName,
            });
        }
        
        next();
    };
}

// ── RBAC: Tenant package limits check ─────────────────────────────────
export function checkTenantLimits(tenantId) {
    const pkg = db.prepareGetPackageByTenant.get(tenantId);
    if (!pkg) return { allowed: false, error: 'No package configured' };
    
    // Check expiry
    if (pkg.expires_at && pkg.expires_at < Date.now()) {
        return { allowed: false, error: 'Package expired' };
    }
    
    // Check session limit
    const currentSessions = db.prepareCountTenantSessions.get(tenantId).c;
    if (currentSessions >= pkg.max_sessions) {
        return { allowed: false, error: `Session limit reached (${pkg.max_sessions})` };
    }
    
    // Check daily message limit
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayMessages = db.prepareCountTenantMessagesToday.get(tenantId, todayStart).c;
    if (todayMessages >= pkg.max_messages_per_day) {
        return { allowed: false, error: `Daily message limit reached (${pkg.max_messages_per_day})` };
    }
    
    // Check broadcast limit
    if (pkg.max_broadcasts_per_day > 0) {
        const todayBroadcasts = db.prepareCountTenantBroadcastsToday.get(tenantId, todayStart).c;
        if (todayBroadcasts >= pkg.max_broadcasts_per_day) {
            return { allowed: false, error: `Daily broadcast limit reached (${pkg.max_broadcasts_per_day})` };
        }
    }
    
    return { 
        allowed: true, 
        package: pkg.package_name,
        limits: {
            max_sessions: pkg.max_sessions,
            max_messages_per_day: pkg.max_messages_per_day,
            max_broadcasts_per_day: pkg.max_broadcasts_per_day,
        },
        usage: {
            sessions: currentSessions,
            messages_today: todayMessages,
        }
    };
}

// ── RBAC: List all roles ──────────────────────────────────────────────
export function getRoles() {
    return db.prepareGetRoles.all();
}

// ── RBAC: Create role ─────────────────────────────────────────────────
export function createRole({ name, description, permissions = [] }) {
    const id = 'role_' + crypto.randomBytes(8).toString('hex');
    const now = Date.now();
    db.prepareInsertRole.run(id, name, description, JSON.stringify(permissions), 0, now);
    permissionCache.clear(); // Clear cache
    return { id, name, description, permissions, is_system: false };
}

// ── RBAC: Update role ─────────────────────────────────────────────────
export function updateRole(name, { description, permissions }) {
    const existing = db.prepareGetRoleByName.get(name);
    if (!existing) return null;
    if (existing.is_system) throw new Error('Cannot modify system role');
    
    const now = Date.now();
    db.prepareUpdateRole.run(
        description ?? existing.description,
        permissions ? JSON.stringify(permissions) : existing.permissions,
        now, name
    );
    permissionCache.clear(); // Clear cache
    return { ...existing, description: description ?? existing.description, permissions: permissions ?? JSON.parse(existing.permissions) };
}

// ── RBAC: Delete role ─────────────────────────────────────────────────
export function deleteRole(name) {
    const existing = db.prepareGetRoleByName.get(name);
    if (!existing) return false;
    if (existing.is_system) throw new Error('Cannot delete system role');
    
    db.prepareDeleteRole.run(name);
    permissionCache.clear();
    return true;
}

export function createUser({ username, email, password, role = 'operator' }) {
    if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    const id = crypto.randomUUID();
    const hash = hashPassword(password);
    const now = Date.now();
    db.prepare('INSERT INTO users (id, username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, username, email, hash, role, now);
    return { id, username, email, role };
}

export function getUserByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function getUserById(id) {
    return db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(id);
}

export function getUsers() {
    return db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC').all();
}

export function deleteUser(id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export const requireApiAuth = authMiddleware;
export function authMiddleware(req, res, next) {
    const header = req.headers['authorization'];
    if (header && header.startsWith('Bearer ')) {
        const decoded = verifyToken(header.slice(7));
        if (decoded) { req.user = decoded; return next(); }
        return res.status(401).json({ error: 'Access token expired' });
    }
    return res.status(401).json({ error: 'No access token provided' });
}

export function optionalAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (header && header.startsWith('Bearer ')) {
        const decoded = verifyToken(header.slice(7));
        if (decoded) req.user = decoded;
    }
    next();
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
        next();
    };
}
