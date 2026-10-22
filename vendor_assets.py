#!/usr/bin/env python3
"""Optional image vendoring. Python 3 standard library only.
Run from any folder: python tools/vendor_assets.py
No credentials or API keys. Does not deploy or overwrite the game.
Only the verified entries from assets-manifest.json are fetched.
"""
from pathlib import Path
import argparse,json,time,urllib.request,urllib.error,sys
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--only',help='Fetch one asset key, for example cat.normal')
 p.add_argument('--timeout',type=int,default=20)
 a=p.parse_args()
 manifest=json.loads((ROOT/'assets-manifest.json').read_text(encoding='utf-8'))['assets']
 if a.only:manifest=[x for x in manifest if x['key']==a.only]
 if not manifest:raise SystemExit('No matching asset key.')
 dest=ROOT/'assets';dest.mkdir(exist_ok=True)
 result={};failed=[]
 for asset in manifest:
  key=asset['key'];target=dest/(key+'.jpg')
  if target.exists() and target.stat().st_size>100:
   print('EXISTS',key);continue
  good=False
  for url in [asset['remote'],asset['original']]:
   try:
    req=urllib.request.Request(url,headers={'User-Agent':'MohajikiAssetVendor/2.2 (personal static-game asset packaging)'})
    with urllib.request.urlopen(req,timeout=a.timeout) as r:
     if not r.headers.get('Content-Type','').startswith('image/'):raise ValueError('Response is not an image')
     data=r.read(16*1024*1024+1)
    if len(data)>16*1024*1024:raise ValueError('Image exceeds 16 MB')
    if not data.startswith(b'\xff\xd8'):raise ValueError('Expected JPEG bytes')
    temp=target.with_suffix('.tmp');temp.write_bytes(data);temp.replace(target);good=True;print('SAVED',key,len(data));break
   except (OSError,ValueError,urllib.error.URLError) as e:print('WARN',key,str(e),file=sys.stderr);time.sleep(1.0)
  if not good:failed.append(key)
  time.sleep(1.0)
 # Keep all successfully vendored files, including earlier runs.
 for x in json.loads((ROOT/'assets-manifest.json').read_text(encoding='utf-8'))['assets']:
  path=dest/(x['key']+'.jpg')
  if path.exists() and path.stat().st_size>100:result[x['key']]='assets/'+path.name
 (ROOT/'assets-local.js').write_text('/* Generated local image mapping. Keep ASSET_CREDITS.md. */\nwindow.MOHAJIKI_LOCAL_ASSETS='+json.dumps(result,separators=(',',':'))+';\n',encoding='utf-8')
 print('Local images:',len(result),'Failures:',len(failed))
 if failed:print('Missing assets still use remote URLs:',', '.join(failed));return 1
 return 0
if __name__=='__main__':raise SystemExit(main())
