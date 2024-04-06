from dotenv import load_dotenv
from guidance import assistant, gen, models, system, user
from openai import OpenAI
from os import getenv
from re import search

client = OpenAI()

def clean_response(response):
    pattern = r"[0-9]+"
    matches = search(pattern, response)
    if matches:
        return matches.group(0)
    else:
        raise ValueError("No numeric value found in the response.")
    
def gen_summary(food_description):
    system_message = "You are a food name summarizer. " + \
        "When given a description of a meal, " + \
        "your job is to condense the description into a concise title. " + \
        "Reply in JSON format with the word 'Description' as the key " + \
        "and the summary as the value. The summary should be short, " + \
        "as if it was an item on a menu."
    
    messages = [{"role": "system", "content": system_message}]

    user_message = {
        "role": "user",
        "content": food_description
    }

    messages.append(user_message)

    response = client.chat.completions.create(
        model="gpt-4-1106-preview",
        response_format={ "type": "json_object" },
        messages=messages
    )

    return response.choices[0].message.content


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
    nutrients = gen_nutrients(meal)
    nutrients["summary"] = gen_summary(meal)
    print(nutrients)

if __name__ == "__main__":
    main()
