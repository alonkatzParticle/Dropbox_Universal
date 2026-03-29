import os
from dotenv import load_dotenv
import dropbox
from dropbox import DropboxOAuth2FlowNoRedirect
load_dotenv()
APP_KEY=os.getenv('DROPBOX_APP_KEY')
APP_SECRET=os.getenv('DROPBOX_APP_SECRET')
auth_code='NeL_GIPN8l0AAAAAAAAAcaBb5tdWZfItmJHiQ6Vkdeg'
auth_flow=DropboxOAuth2FlowNoRedirect(consumer_key=APP_KEY, consumer_secret=APP_SECRET, token_access_type='offline')
try:
  res = auth_flow.finish(auth_code)
  print('SUCCESS_REFRESH_TOKEN='+res.refresh_token)
except Exception as e:
  print('FAILED:', e)