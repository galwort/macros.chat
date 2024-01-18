from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from log_food import gen_nutrients

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)