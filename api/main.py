from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from json import loads
from log_food import gen_nutrients, gen_summary
from pydantic import BaseModel
import logging

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
        nutrients = loads(gen_nutrients(meal.text))
        summary = loads(gen_summary(meal.text))
        nutrients.update(summary)
        return nutrients
    except Exception as e:
        logging.error(f"Error processing meal: {e}")
        raise HTTPException(status_code=500, detail=str(e))