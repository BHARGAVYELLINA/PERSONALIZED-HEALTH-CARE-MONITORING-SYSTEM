import random
import mysql.connector
from datetime import datetime, timedelta

db_health_monitoring = mysql.connector.connect(
    host="localhost",
    user="root",
    password="bhargav",
    database="health_monitoring"
)

db_fasting = mysql.connector.connect(
    host="localhost",
    user="root",
    password="bhargav",
    database="fasting"
)

cursor_health_monitoring = db_health_monitoring.cursor()
cursor_fasting = db_fasting.cursor()

start_date = datetime(2024, 3, 1)
end_date = datetime.now()

current_date = start_date
while current_date <= end_date:
    steps = random.randint(1000, 15000)
    calories = random.randint(1000, 3000)
    sleep_hours = round(random.uniform(4, 10), 1)
    exercises = random.choice(['Running', 'Swimming', 'Cycling', 'Yoga'])
    calories_burned = random.randint(500, 2000)
    screen_time = random.randint(1, 10) 
    
    cursor_health_monitoring.execute("INSERT INTO users_activity_data (date, steps, calories, sleep_hours, exercises, calories_burned, screen_time) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                                     (current_date, steps, calories, sleep_hours, exercises, calories_burned, screen_time))
    db_health_monitoring.commit()
    
    fasting_start_date = current_date - timedelta(days=2)
    fasting_end_date = current_date - timedelta(days=1)
    fasting_start_time = "18:30:00"
    fasting_end_time = "18:30:00"
    fasting_duration = random.randint(1, 20)
    fasting_endduration = 24 - fasting_duration

    cursor_fasting.execute("INSERT INTO fasting_periods (start_date, start_time, end_date, end_time, duration, endduration) VALUES (%s, %s, %s, %s, %s, %s)",
                           (fasting_start_date, fasting_start_time, fasting_end_date, fasting_end_time, fasting_duration, fasting_endduration))
    db_fasting.commit()
    
    current_date += timedelta(days=1)

print("Random data and corresponding fasting periods inserted successfully")

# Close connections
db_health_monitoring.close()
db_fasting.close()
