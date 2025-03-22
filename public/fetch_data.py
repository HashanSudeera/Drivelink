import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

# Initialize Firebase
cred = credentials.Certificate("firebase-key.json")  # Path to your Firebase key
firebase_admin.initialize_app(cred)

# Fetch Data from Firestore
db = firestore.client()
reports_ref = db.collection("dailyReports")
docs = reports_ref.stream()

# Convert to DataFrame
data = []
for doc in docs:
    data.append(doc.to_dict())

df = pd.DataFrame(data)
print(df.head())  # Check the data

# Save Data to CSV (optional)
df.to_csv("daily_reports.csv", index=False)