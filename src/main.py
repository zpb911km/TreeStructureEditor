from PySide6.QtCore import Qt
from PySide6.QtGui import QIcon, QFont, QTextCursor
from PySide6.QtWidgets import QApplication, QVBoxLayout, QFileDialog, QFontComboBox
from qfluentwidgets import FluentTitleBar, label, CommandBar, Action, PlainTextEdit, SpinBox, InfoBar, setTheme, Theme, FluentIcon, InfoBarPosition, MessageBoxBase, SubtitleLabel
from qframelesswindow import AcrylicWindow
from time import time
from core import parser_internal2text, parser_text2internal
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
import unicodedata
import os


# switch path, you can delete this when you run.
os.chdir('e:/myfiles/python/TreeStructureEditor')


def Replace(text):
    rpl = []
    try:
        open('.\\resource\\replace_sheet.txt', 'r', encoding='UTF-8')
    except FileNotFoundError:
        return text
    with open('.\\resource\\replace_sheet.txt', 'r', encoding='UTF-8') as sheet:
        lines = sheet.read().split('\n')
        for line in lines:
            if len(line) == 0:
                continue
            if line[0] == '#':
                continue
            rpl.append((line.split('~~~')[0], line.split('~~~')[1]))
    for pair in rpl:
        text = text.replace(pair[0], pair[1])
    return text


class SizeMessageBox(MessageBoxBase):
    """ Font Size message box """

    def __init__(self, parent=None, size: int = 16):
        super().__init__(parent)
        self.titleLabel = SubtitleLabel('调整字号', self)
        self.spinbox = SpinBox()
        self.spinbox.setValue(size)
        self.viewLayout.addWidget(self.titleLabel)
        self.viewLayout.addWidget(self.spinbox)
        self.yesButton.setText('确定')
        self.cancelButton.setText('取消')
        self.widget.setMinimumWidth(350)


class FontMessageBox(MessageBoxBase):
    """ Font message box """

    def __init__(self, parent=None, current_font: QFont = QFont(['Unfont'])):
        super().__init__(parent)
        self.titleLabel = SubtitleLabel('调整字体', self)
        self.box = QFontComboBox()
        self.box.setCurrentFont(current_font)
        self.viewLayout.addWidget(self.titleLabel)
        self.viewLayout.addWidget(self.box)
        self.yesButton.setText('确定')
        self.cancelButton.setText('取消')
        self.widget.setMinimumWidth(350)


class MainWindow(AcrylicWindow):
    def __init__(self):
        super().__init__()
        self.setupUI()
        self.count = 0
        self.LST = time()
        self.text_ = ''

    def setupUI(self):
        self.resize(1000, 600)
        setTheme(Theme.DARK)
        self.setTitleBar(FluentTitleBar(self))
        # self.windowEffect.setAeroEffect(self.winId())
        self.windowEffect.setAcrylicEffect(self.winId(), '00102030')
        self.verticalLayout = QVBoxLayout(self)
        self.verticalLayout.setContentsMargins(10, 35, 10, 10)
        self.verticalLayout.setAlignment(Qt.AlignTop)
        self.CommandBar = CommandBar(self)
        self.CommandBar.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        self.CommandBar.addAction(Action(FluentIcon.FOLDER, 'Open', triggered=self.Open, shortcut='Ctrl+O'))
        self.CommandBar.addAction(Action(FluentIcon.SAVE, 'Save', triggered=self.Save, shortcut='Ctrl+S'))
        self.CommandBar.addSeparator()
        self.CommandBar.addAction(Action(FluentIcon.SYNC, 'Refresh', triggered=self.format, shortcut='F5'))
        self.CommandBar.addAction(Action(FluentIcon.HISTORY, 'Undo', triggered=self.undo, shortcut='Ctrl+Z'))
        self.CommandBar.addAction(Action(FluentIcon.PRINT, 'Print', triggered=self.PrintPDF, shortcut='Ctrl+P'))
        self.CommandBar.addAction(Action(FluentIcon.FONT, 'Font', triggered=self.changeFont))
        self.CommandBar.addAction(Action(FluentIcon.FONT_SIZE, 'Font Size', triggered=self.setFontSize))
        self.verticalLayout.addWidget(self.CommandBar, 0)
        self.plainTextEdit = PlainTextEdit(self)
        self.plainTextEdit.setFont(QFont(['Unifont'], 16))
        self.plainTextEdit.setLineWrapMode(PlainTextEdit.NoWrap)
        self.verticalLayout.addWidget(self.plainTextEdit)
        self.status = label.QLabel()
        self.status.setStyleSheet('QLabel{color:#80ffffff;}')
        self.verticalLayout.addWidget(self.status)
        self.plainTextEdit.textChanged.connect(self.format)
        self.setWindowIcon(QIcon(".\\resource\\symbol1.png"))
        self.setWindowTitle("TreeStructureEditor V0.2.0")

    def undo(self):
        self.plainTextEdit.textChanged.disconnect(self.format)
        self.plainTextEdit.setPlainText(self.text_)
        self.plainTextEdit.textChanged.connect(self.format)

    def PrintPDF(self):
        text = Replace(self.plainTextEdit.toPlainText())
        PATH, _ = QFileDialog.getSaveFileName(
            self,
            "保存",
            "E:\ServerSyncFiles",
            "PDF文件 (*.pdf)")
        if PATH != '':
            with open(PATH, 'w', encoding='UTF-8') as file:
                file.write(format(text))
            self.count = 1
            self.info('success', 'Saved PDF!', PATH, 2000)
        else:
            self.info('error', 'error', 'Invalid Path!')
            return None
        contentl = text.split('\n')
        c = canvas.Canvas(PATH, pagesize=A4)
        pdfmetrics.registerFont(TTFont('Unifont', 'Unifont.ttf'))
        c.setFont("Unifont", 12)
        y = 785
        for s in contentl:
            c.drawString(35, y, s)
            y -= 12
            if y < 80:
                c.showPage()  # 生成新页面
                c.setFont("Unifont", 12)  # 设置新页面的字体
                y = 760  # 重置y坐标
        c.save()

    def changeFont(self):
        size = self.plainTextEdit.font().pointSize()
        widget = FontMessageBox(self, self.plainTextEdit.font())
        if widget.exec():
            self.plainTextEdit.setFont(QFont(widget.box.currentFont().families(), size))

    def setFontSize(self):
        widget = SizeMessageBox(self, self.plainTextEdit.font().pointSize())
        if widget.exec():
            self.plainTextEdit.setFont(QFont(['Unifont'], widget.spinbox.value()))

    def Open(self):
        self.PATH, _ = QFileDialog.getOpenFileName(
            self,
            '打开',
            "E:\ServerSyncFiles",
            "文本文件 (*.zpb *.txt)")
        if self.PATH == '':
            self.info('error', 'error', 'Invalid Path!')
            return None
        try:
            file = open(self.PATH, encoding='UTF-8')
            text = file.read()
        except UnicodeDecodeError:
            file = open(self.PATH, encoding='ANSI')
            text = file.read()
        self.setWindowTitle(self.windowTitle() + '  ' + file.name.split('/')[-1].split('.')[0])
        file.close()
        self.count = 1
        self.plainTextEdit.textChanged.disconnect(self.format)
        self.plainTextEdit.setPlainText(text)
        self.text_ = text
        self.plainTextEdit.textChanged.connect(self.format)

    def info(self, status: str, title='', content: str = '', delay: int = 2000):
        if len(title) == 0:
            title = status
        if status == 'success':
            InfoBar.success(
                title=title,
                content=content,
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP,
                duration=delay,
                parent=self
            )
        elif status == 'error':
            InfoBar.error(
                title=title,
                content=content,
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP,
                duration=delay,
                parent=self
            )
        elif status == 'warning':
            InfoBar.warning(
                title=title,
                content=content,
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP,
                duration=delay,
                parent=self
            )

    def Save(self):
        text = Replace(self.plainTextEdit.toPlainText())
        if self.count == 0:
            self.PATH, _ = QFileDialog.getSaveFileName(
                self,
                "保存",
                "E:\ServerSyncFiles",
                "文本文件 (*.zpb)")
            if self.PATH != '':
                with open(self.PATH, 'w', encoding='UTF-8') as file:
                    file.write(format(text))
                self.count = 1
                self.info('success', 'Saved!', self.PATH)
            else:
                self.info('error', 'error', 'Invalid Path!')
                self.count = 0
        else:
            with open(self.PATH, 'w', encoding='UTF-8') as file:
                file.write(format(text))
            self.info('success', 'Saved!', self.PATH)

    def format(self):
        text = self.plainTextEdit.toPlainText()
        Cursor = self.plainTextEdit.textCursor()
        P = Cursor.position()  # 获取光标位置, type: int
        positionMark = '🥟'
        text = text[:P] + positionMark + text[P:]
        text = Replace(text)
        try:
            t = parser_internal2text(parser_text2internal(text))
            for n, i in enumerate(t.split('\n')):
                if sum(2 if unicodedata.east_asian_width(char) in 'FW' else 1 for char in i) >= 90:
                    self.info('warning', content="第" + str(n + 1) + "行字符数量过多!\n请考虑换行!")
            if positionMark in t:
                if '─>' in t.split(positionMark)[1].split('\n')[0]:
                    t = self.text_.replace(positionMark, '')
                    self.info('warning', "DON'T DO IT AGAIN", '不要改动引导线')
                else:
                    P = len(t.split(positionMark)[0])
                    L = len(t.split(positionMark)[0].split('\n'))
                    col = len(t.split(positionMark)[0].split('\n')[-1])
                    t = t.replace(positionMark, '')
                    self.text_ = t
                    self.status.setText('row:' + str(L) + '  col:' + str(col) + ' sum:' + str(P))
            else:
                t = self.text_.replace(positionMark, '')
                self.info('warning', "DON'T DO IT AGAIN", '不要改动引导线')
            self.plainTextEdit.textChanged.disconnect(self.format)
            self.plainTextEdit.setPlainText(t)
            self.plainTextEdit.textChanged.connect(self.format)
            #if end == 0:
            #    Cursor.setPosition(P)  # 光标归位
            #else:
            #    Cursor.movePosition(QTextCursor.End)
            Cursor.setPosition(P)  # 光标归位
            self.plainTextEdit.setTextCursor(Cursor)
            if time() - self.LST >= 30:
                self.Save()
                self.LST = time()
        except Exception as E:
            self.info('error', 'ERROR!', str(E), 10000)


if __name__ == '__main__':
    app = QApplication([])
    window = MainWindow()
    window.show()
    app.exec()
