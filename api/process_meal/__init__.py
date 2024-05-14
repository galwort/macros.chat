import azure.functions as func
from json import dumps, loads
from pydantic import BaseModel
from .log_food import gen_nutrients, gen_summary


class MealInput(BaseModel):
    text: str


def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
    except ValueError:
        return func.HttpResponse("Invalid JSON", status_code=400)

    meal_input = MealInput(**req_body)
    try:
        nutrients = gen_nutrients(meal_input.text)
        summary = gen_summary(meal_input.text)
        nutrients = loads(nutrients) if isinstance(nutrients, str) else nutrients
        summary = loads(summary) if isinstance(summary, str) else summary
        nutrients.update(summary)

        return func.HttpResponse(dumps(nutrients), mimetype="application/json")
    except Exception as e:
        return func.HttpResponse(str(e), status_code=500)
