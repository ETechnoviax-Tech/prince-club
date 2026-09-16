import re

with open('frontend/src/styles.css', 'r', encoding='utf-8', errors='ignore') as f:
    css = f.read()

# Replacement rules for making the webapp 100% clean white theme

replacements = [
    # Root variables
    ('--bg-core:        #fffff8;', '--bg-core:        #ffffff;'),
    ('--bg-surface:     #f5f4ef;', '--bg-surface:     #f6f7fb;'),
    ('--bg-card-hover:  #f0efe9;', '--bg-card-hover:  #f0f3fa;'),
    
    # Desktop wrapper background
    ('background: #111827;', 'background: #f1f3f7;'),
    ('background: #0f172a;', 'background: #f8fafc;'),
    
    # Dark stage cards
    ('linear-gradient(145deg, #131a2b 0%, #0d121f 100%)', '#ffffff'),
    ('linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', '#ffffff'),
    ('linear-gradient(135deg, #2b174d 0%, #1e1039 100%)', '#ffffff'),
    ('linear-gradient(135deg, #351c5a 0%, #291448 100%)', '#ffffff'),
    ('linear-gradient(135deg, #2a164c 0%, #1f1039 100%)', '#ffffff'),
    ('linear-gradient(135deg, #1e293b, #0f172a)', '#ffffff'),
    
    # Dark card backgrounds
    ('background: #080b13;', 'background: #f3f4f6; color: #111827;'),
    ('background: #111726;', 'background: #ffffff; color: #111827;'),
    ('background: #131926;', 'background: #ffffff; color: #111827;'),
    ('background: #180f2d;', 'background: #ffffff; color: #111827;'),
    ('background: #1c1133;', 'background: #ffffff; color: #111827;'),
    ('background: #140a24;', 'background: #f8fafc; color: #111827;'),
    ('background: #1b1031;', 'background: #ffffff; color: #111827;'),
    ('background: #0b0f1a;', 'background: #ffffff; color: #111827;'),
    ('background: #0a0b10;', 'background: #ffffff; color: #111827;'),
    ('background: #111218;', 'background: #ffffff; color: #111827;'),
    ('background: #1e1929;', 'background: #ffffff; color: #111827;'),
    ('background: #0f1015;', 'background: #ffffff; color: #111827;'),
    ('background: #17181f;', 'background: #ffffff; color: #111827;'),
    ('background: #15161e;', 'background: #ffffff; color: #111827;'),
    ('background: #13141a;', 'background: #ffffff; color: #111827;'),
    ('background: #171c28;', 'background: #ffffff; color: #111827;'),
    ('background: #171d2b;', 'background: #ffffff; color: #111827;'),
    ('background: #0a0e17;', 'background: #ffffff; color: #111827;'),
    ('background: #0d111a;', 'background: #ffffff; color: #111827;'),
    ('background: #0b0f19;', 'background: #ffffff; color: #111827;'),
    ('background: #0b0f1a;', 'background: #ffffff; color: #111827;'),
    
    # Dark input autofill
    ('#0b0f1a', '#ffffff'),
]

count = 0
for old, new in replacements:
    if old in css:
        css = css.replace(old, new)
        count += 1

print(f'Applied {count} string replacements.')

with open('frontend/src/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print('Updated styles.css successfully.')
