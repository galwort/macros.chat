from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from json import loads
from openai import OpenAI

vault_url = "https://kv-galwort.vault.azure.net/"
credential = DefaultAzureCredential()
secret_client = SecretClient(vault_url=vault_url, credential=credential)
client = OpenAI(api_key=secret_client.get_secret("OAIKey").value)

def gen_summary(food_description):
    system_message = "You are a food name summarizer. " + \
        "When given a description of a meal, " + \
        "your job is to condense the description into a concise title. " + \
        "Reply in JSON format with the word 'summary' as the key " + \
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


def gen_nutrients(food_description):
    system_message = "You are a nutritional value predictor. " + \
        "When given a description of a meal, " + \
        "your job is to reply with numerical values " + \
        "for the three macronutrients and calories. " + \
        "Reply in JSON format with the following keys: " + \
        "'carbs', 'fats', 'proteins', and 'calories'." + \
        "The values should only be numerical."
    
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

def main():
    print("What did you eat?")
    meal = input()
    nutrients = loads(gen_nutrients(meal))
    summary = loads(gen_summary(meal))
    nutrients.update(summary)
    print(nutrients)

if __name__ == "__main__":
    main()
