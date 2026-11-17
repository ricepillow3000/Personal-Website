"""Clean a Gemini-drawn SVG for the film cuts (python3 -I tools/clean-film-svg.py in.svg out.svg).
- strips anything active or external: <script>, <foreignObject>, on* handlers, external hrefs
- strips <text> (the art must carry no words or numbers)
- makes red rooftop beacons blink (CSS inside the SVG, works in <img>)
- squeezes whitespace and number precision"""
import re, sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
s = re.sub(r'<\?xml[^>]*\?>|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->', '', s)
s = re.sub(r'<(script|foreignObject)[\s\S]*?</\1>', '', s, flags=re.I)
s = re.sub(r'<text[\s\S]*?</text>', '', s, flags=re.I)
s = re.sub(r'\s on[a-z]+\s*=\s*("[^"]*"|\'[^\']*\')', ' ', s, flags=re.I)
s = re.sub(r'(xlink:)?href\s*=\s*"(?!#)[^"]*"', '', s)
s = re.sub(r'(\d+\.\d{2})\d+', r'\1', s)
s = re.sub(r'>\s+<', '><', s)
s = re.sub(r'[ \t]{2,}', ' ', s)
blink = ('<style>circle[fill="#E5191C"],circle[fill="#e5191c"]{animation:b 1.4s steps(2,jump-none) infinite}'
         'circle[fill="#E5191C"]:nth-of-type(3n),circle[fill="#e5191c"]:nth-of-type(3n){animation-delay:-.7s}'
         '@keyframes b{50%{opacity:.25}}@media (prefers-reduced-motion:reduce){circle{animation:none!important}}</style>')
s = re.sub(r'(<svg[^>]*>)', r'\1' + blink, s, count=1)
open(dst, 'w', encoding='utf-8').write(s.strip())
print(dst, len(s))
