PATH = "D:\新建文件夹\化学坑点.zpb"
olist = []
raw = ''
with open(PATH, encoding='UTF-8') as produced:
    plist = produced.read().split('\n')
for line in plist:
    inum = int(len(line.split('>', 1)[0]) / 4)
    try:
        olist.append('\t' * inum + line.split('>', 1)[1])
    except IndexError:
        print('!!')
for line in olist:
    raw += line + '\n'
with open(PATH, 'w', encoding='UTF-8') as produced:
    produced.write(raw[:-1])
    produced.close()
