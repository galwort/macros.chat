from dotenv import load_dotenv
from guidance import assistant, gen, models, system, user
from os import getenv
from re import search

load_dotenv()
OPENAI_API_KEY = getenv("OPENAI_API_KEY")

def clean_response(response):
    pattern = r"[0-9]+"
    matches = search(pattern, response)
    return matches.group(0)

def gen_summary(food_description):
    gpt = models.OpenAI("gpt-4-1106-preview", echo=False)

    with system():
        lm = (
            gpt
            + "You are an assistant providing a shortened summary "
            + "given the description of a meal, "
            + "consistently offering only the shortened summary "
            + "without any additional explanation or context. "
            + "You will respond to all queries with only the summary. "
            + "You are programmed to consistently avoid elaborating "
            + "on the reasons behind your summarizations, "
            + "focusing solely on delivering only the summary. "
            + "Your communication will be concise."
        )

    with user():
        lm += food_description

    with assistant():
        lm += gen("response")

    return lm["response"]

def gen_nutrients(food_description, nutrient="calories"):
    nutrients = ["carbs", "fats", "proteins", "calories", "all"]
    if nutrient not in nutrients:
        nutrient_list = ", ".join(nutrients[:-1])
        raise ValueError(f"Nutrient must be {nutrient_list} or {nutrients[-1]}.")

    gpt = models.OpenAI("gpt-4-1106-preview", echo=False)

    with system():
        lm = (
            gpt
            + "You are an assistant providing direct numerical answers "
            + "to questions about the nutritional content of food, "
            + "given the description of a meal, "
            + "consistently offering only the specific number "
            + "without any additional explanation or context. "
            + "You will respond to all queries with only precise numerical values. "
            + "You are programmed to consistently avoid elaborating "
            + "on the reasons behind your numerical determinations, "
            + "focusing solely on delivering quantifiable answers. "
            + "Your communication will be concise."
        )

    nutrient_dict = {}
    if nutrient == "all":
        for nutrient in nutrients[:-1]:
            with user():
                lm += food_description
                lm += f"How many {nutrient} would be in the that?"

            with assistant():
                lm += gen("response")

            nutrient_dict[nutrient] = clean_response(lm["response"])
    else:
        with user():
            lm += food_description
            lm += f"How many {nutrient} would be in the that?"

        with assistant():
            lm += gen("response")
        
        nutrient_dict[nutrient] = clean_response(lm["response"])

    return nutrient_dict

def main():
    print("What did you eat?")
    meal = input()
    summary = gen_summary(meal)
    nutrients = gen_nutrients(meal)
    print(summary)
    print(nutrients)

if __name__ == "__main__":
    main()
