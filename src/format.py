def func(text1: list[str], maxlength: int) -> str:
    indention = []
    style = []
    space = []

    try:
        if text1[1][0:4] == '    ':
            for t in range(0, len(text1)):
                for i in range(0, 20):
                    if text1[t][0:4*i] == '    '*i and text1[t][4*i] != ' ' and text1[t][0] == ' ':
                        indention.append(i)
                    # 0:'├─' , 1:'└─', 2:''
                        style.append(0)
                        text1[t] = text1[t][4*i:]
                        space.append(['    ']*i)
                        break
                    elif text1[t][0] != ' ':  # the first level can not indent
                        indention.append(0)
                    # 0:'├─' , 1:'└─' , 2:''
                        style.append(2)
                        space.append('')
                        break
        else:
            for t in range(0, len(text1)):
                for i in range(0, 20):
                    if text1[t][0:i] == text1[t][0]*i and text1[t][i] != text1[t][0] and text1[t][0] == text1[t][0]:
                        indention.append(i)
                    # 0:'├─' , 1:'└─', 2:''
                        style.append(0)
                        text1[t] = text1[t][i:]
                        space.append(['    ']*i)
                        break
                    elif t == 0:  # the first level can not indent
                        indention.append(0)
                    # 0:'├─' , 1:'└─' , 2:''
                        style.append(2)
                        space.append('')
                        break
    except IndexError:
        raise
        print('第',t+1,'行出错了！！')
        sleep(3)
        #exit()
        return '0'
#  print(indention)
    print('analyzing...')
    for i in range(1, len(text1)):
        for j in range(i+1, len(text1)):
            if indention[i] == indention[j]:
                style[i] = 0
                break
            elif indention[i] > indention[j]:
                style[i] = 1
                break
            elif j == len(text1)-1:
                style[i] = 1
                break
        for k in range(i+1, j):
            if style[i] == 0:
                space[k][indention[i]-1] = '  │ '
        match style[i]:
            case 0:
                space[i][indention[i]-1] = '  ├─'
            case 1:
                space[i][indention[i]-1] = '  └─'
    #  print(i, j, indention[i])
    style[len(text1)-1] = 1
    space[len(text1)-1][indention[len(text1)-1]-1] = '  └─'
#  print(style)
    pstr = ''
    sstr = ''


    for i in range(0, len(space)):
        for j in space[i]:
            pstr += j
        if len(pstr + text1[i] + '\n') >= maxlength:
            if text1[0] == '@@':
                pstr = pstr[4:]
            sstr += pstr + text1[i][:maxlength - len(pstr)] + '\n'
            text1[i] = text1[i][maxlength - len(pstr):]
            if style[i] == 0:
                replace = '  │ '
            else:
                replace = '    '
            while len(pstr + text1[i] + '\n') >= maxlength:
                if text1[0] == '@@':
                    pstr = pstr[4:]
                sstr += pstr[:-4]+ replace + text1[i][:maxlength - len(pstr)] + '\n'
                text1[i] = text1[i][maxlength - len(pstr):]
            if text1[0] == '@@':
                pstr = pstr[4:]
            if text1[i] != '' and text1[i] != '\n' and text1[i] != ' ':
                sstr += pstr[:-4]+ replace + text1[i][:maxlength - len(pstr)] + '\n'
                text1[i] = text1[i][maxlength - len(pstr):]
            continue
    #  print(pstr + text1[i])
        if text1[0] == '@@':
            pstr = pstr[4:]
            if i == 0:
                continue
        sstr += pstr + text1[i] + '\n'
        pstr = ''
    sstr = sstr[:-1]
    return sstr


if __name__ == '__main__':
    while True:
        try:
            maxlength = int(input('maxlenth = '))
            break
        except:
            print('输入整数！')

    print('opening file...')
    import sys
    from time import sleep

    text0 = open(sys.argv[1], encoding='UTF-8').read()
    text1 = text0.split('\n')
    print(repr(text1))
    sstr = func(text1, maxlength)
     #print(sstr)
    with open(sys.argv[1][:-4] + '&' + '.txt', 'w', encoding = 'UTF-8') as file:
        file.write(sstr)
        file.close()
    print('preview:')
    print(sstr)
    sleep(3)
    #for limit in range(27,31):
    #    text1 = text0.split('\n')
    #    sstr = func(text1, limit)
    #    print('preview:', limit)
    #    print(sstr + '\n\n\n')
