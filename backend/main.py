from fastapi import FastAPI

app = FastAPI(
    title="GeoPulse API",
    description="Backend API for GeoPulse Hyper-Local Retail Mobility Analytics",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "project": "GeoPulse",
        "message": "GeoPulse Backend API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }