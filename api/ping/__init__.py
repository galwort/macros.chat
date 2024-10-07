import azure.functions as func
from datetime import datetime
from logging import info


def main(ping: func.TimerRequest) -> None:
    current_time = datetime.now()
    info(f"Pinged at {current_time}")
