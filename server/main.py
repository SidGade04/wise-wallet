from fastapi import FastAPI
from app.routes.ai_routes import router as ai_router
from app.routes.plaid_routes import router as plaid_router
from fastapi.middleware.cors import CORSMiddleware
from app.routes.stripe_routes import router as stripe_router
from app.routes import settings_routes
from fastapi.responses import JSONResponse
from starlette.requests import Request

app = FastAPI(title="Plaid Integration API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # use specific domains in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API groups
app.include_router(ai_router,        prefix="/api",        tags=["ai"])
app.include_router(plaid_router,     prefix="/api/plaid",  tags=["plaid"])
app.include_router(stripe_router,    prefix="/api/stripe", tags=["stripe"])
app.include_router(settings_routes.router)  # router already has prefix="/api"

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Plaid Integration API is running"}

@app.get("/health")
async def health():
    return {"ok": True}

@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)