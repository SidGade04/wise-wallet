from fastapi import FastAPI
from app.routes.ai_routes import router as ai_router
from app.routes.plaid_routes import router as plaid_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Plaid Integration API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # use specific domains in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ai_router, prefix="/api")
app.include_router(plaid_router, prefix="/api/plaid")

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Plaid Integration API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)