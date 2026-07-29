from setuptools import setup, find_packages
setup(
    name="waaceh-sdk",
    version="1.0.0",
    packages=find_packages(),
    install_requires=["httpx"],
    description="WaAceh WhatsApp Gateway Python SDK",
)
