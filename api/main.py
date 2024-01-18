from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from log_food import gen_nutrients
from pydantic import BaseModel

app = FastAPI()
class MealInput(BaseModel):
    text: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process_meal/")
async def process_meal(meal: MealInput):
    try:
        nutrients = gen_nutrients(meal.text, "all")
        return nutrients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 