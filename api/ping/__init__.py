import azure.functions as func
from datetime import datetime
from logging import info

app = func.FunctionApp()


@app.timer_trigger(
    schedule="0 */5 * * * *",
    arg_name="ping",
    run_on_startup=False,
    use_monitor=False,
)
def refresh(ping: func.TimerRequest) -> None:
    current_time = datetime.now()
    info(f"Pinged at {current_time}")
