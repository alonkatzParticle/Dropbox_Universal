import os
from dotenv import load_dotenv
import sys
import dropbox

load_dotenv()

token = os.getenv("DROPBOX_REFRESH_TOKEN")
app_key = os.getenv("DROPBOX_APP_KEY")
app_secret = os.getenv("DROPBOX_APP_SECRET")

print("Key:", app_key)
print("Secret:", app_secret)
print("Token:", token)

print("\n--- Testing as Access Token ---")
try:
    dbx1 = dropbox.Dropbox(token)
    account = dbx1.users_get_current_account()
    print("Account:", account.name.display_name)
    print("SUCCESS: It is an ACCESS token!")
except Exception as e:
    print("FAILED access token test:", type(e).__name__, str(e))

print("\n--- Testing as Refresh Token ---")
try:
    dbx2 = dropbox.Dropbox(oauth2_refresh_token=token, app_key=app_key, app_secret=app_secret)
    account = dbx2.users_get_current_account()
    print("Account:", account.name.display_name)
    print("SUCCESS: It is a REFRESH token!")
except Exception as e:
    print("FAILED refresh token test:", type(e).__name__, str(e))
