from PySide6.QtCore import Qt, QSize, QEventLoop, QTimer
from PySide6.QtGui import QIcon, QFont, QTextCursor
from PySide6.QtWidgets import QApplication, QWidget, QVBoxLayout, QFileDialog, QFontComboBox
from qfluentwidgets import SplitTitleBar, MSFluentTitleBar, FluentTitleBar, TitleLabel, CommandBar, Action, setFont, SplashScreen, PlainTextEdit, SpinBox, InfoBar, setTheme, Theme, FluentIcon, InfoBarPosition, MessageBoxBase, SubtitleLabel
from qframelesswindow import AcrylicWindow
from time import time
from core import parser_internal2text, parser_text2internal
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics


def Replace(text):
    rpl = [
        ['?=', '≟'],
        ['--》', '→'],
        ['-->', '→'],
        ['《--', '←'],
        ['<--', '←'],
        ['<->', '↔'],
        ['《-》', '↔'],
        ['*·', '×'],
        ['》', '>'],
        ['《', '<'],
        ['，', ','],
        ['。', '.'],
        ['：', ':'],
        ['；', ';'],
        ['（', '('],
        ['）', ')'],
        ['……', '...'],
        ['、', ','],
        ['！', '!'],
        ['？', '?'],
        ['“', '"'],
        ['”', '"'],
        ['【', '['],
        ['】', ']'],
        ['`', '·'],
        ['<=', '≤'],
        ['>=', '≥'],
        ['\t', '  ']
    ]
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
        self.resize(700, 600)
        setTheme(Theme.DARK)
        self.setWindowTitle("TreeStructureEditor V0.1.9")
        self.setStyleSheet('MainWindow{background: rgba(0, 20, 30, 0.7)}')
        self.splashScreen = SplashScreen(QIcon(".\\resource\\symbol1.png"), self)
        self.splashScreen.setIconSize(QSize(100, 100))
        self.show()
        loop = QEventLoop(self)
        QTimer.singleShot(1000, loop.quit)
        loop.exec()
        self.splashScreen.finish()
        self.verticalLayout = QVBoxLayout(self)
        self.titleLable = SubtitleLabel(self)
        setFont(self.titleLable, 16)
        self.titleLable.setText(self.windowTitle())
        self.titleLable.setMaximumSize(QSize(200, 18))
        self.verticalLayout.addWidget(self.titleLable)
        self.CommandBar = CommandBar(self)
        self.CommandBar.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        self.CommandBar.addAction(Action(FluentIcon.FOLDER, 'Open', triggered=self.Open, shortcut='Ctrl+O'))
        self.CommandBar.addAction(Action(FluentIcon.SAVE, 'Save', triggered=self.Save, shortcut='Ctrl+S'))
        self.CommandBar.addSeparator()
        self.CommandBar.addAction(Action(FluentIcon.PRINT, 'Print', triggered=self.PrintPDF, shortcut='Ctrl+P'))
        self.CommandBar.addAction(Action(FluentIcon.FONT, 'Font', triggered=self.changeFont))
        self.CommandBar.addAction(Action(FluentIcon.FONT_SIZE, 'Font Size', triggered=self.setFontSize))
        self.verticalLayout.addWidget(self.CommandBar, 0)
        self.plainTextEdit = PlainTextEdit(self)
        self.plainTextEdit.setFont(QFont(['Unifont'], 16))
        self.plainTextEdit.setLineWrapMode(PlainTextEdit.NoWrap)
        self.verticalLayout.addWidget(self.plainTextEdit)
        self.plainTextEdit.textChanged.connect(self.format)
        self.count = 0
        self.LST = time()

    def PrintPDF(self):
        text = Replace(self.plainTextEdit.toPlainText())
        self.PATH, _ = QFileDialog.getSaveFileName(
            self,
            "保存",
            "E:\\Nutstore\\总结梳理",
            "PDF文件 (*.pdf)")
        if self.PATH != '':
            with open(self.PATH, 'w', encoding='UTF-8') as file:
                file.write(format(text))
            self.count = 1
            InfoBar.success(
                title='Saved!',
                content=self.PATH,
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP,
                duration=2000,
                parent=self
            )
        else:
            InfoBar.error(
                title='ERROR!',
                content="Path ???",
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP,
                duration=2000,
                parent=self
            )
            return None
        contentl = text.split('\n')
        c = canvas.Canvas(self.PATH, pagesize=A4)
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
            "E:\\Nutstore\\总结梳理",
            "文本文件 (*.zpb *.txt)")
        if self.PATH == '':
            InfoBar.error(
                title='ERROR!',
                content="Path ???",
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP,
                duration=2000,
                parent=self
            )
            return None
        try:
            file = open(self.PATH, encoding='UTF-8')
            text = file.read()
        except UnicodeDecodeError:
            file = open(self.PATH, encoding='ANSI')
            text = file.read()
        file.close()
        self.count = 1
        try:
            self.plainTextEdit.textChanged.disconnect(self.format)
        except RuntimeError:
            pass
        self.plainTextEdit.setPlainText(text)
        self.plainTextEdit.textChanged.connect(self.format)

    def Save(self):
        text = Replace(self.plainTextEdit.toPlainText())
        if self.count == 0:
            self.PATH, _ = QFileDialog.getSaveFileName(
                self,
                "保存",
                "E:\\Nutstore\\总结梳理",
                "文本文件 (*.zpb)")
            if self.PATH != '':
                with open(self.PATH, 'w', encoding='UTF-8') as file:
                    file.write(format(text))
                self.count = 1
                InfoBar.success(
                    title='Saved!',
                    content=self.PATH,
                    orient=Qt.Horizontal,
                    isClosable=True,
                    position=InfoBarPosition.TOP,
                    duration=2000,
                    parent=self
                )
            else:
                InfoBar.error(
                    title='ERROR!',
                    content="Path ???",
                    orient=Qt.Horizontal,
                    isClosable=True,
                    position=InfoBarPosition.TOP,
                    duration=2000,
                    parent=self
                )
                self.count = 0
        else:
            with open(self.PATH, 'w', encoding='UTF-8') as file:
                file.write(format(text))
            InfoBar.success(
                title='Saved!',
                content=self.PATH,
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP,
                duration=2000,
                parent=self
            )

    def format(self):
        text = Replace(self.plainTextEdit.toPlainText())
        if text[-1] == '\n':
            end = 1
        else:
            end = 0
        try:
            t = parser_internal2text(parser_text2internal(text))
            Cursor = self.plainTextEdit.textCursor()
            P = Cursor.position()  # 获取光标位置
            self.plainTextEdit.textChanged.disconnect(self.format)
            self.plainTextEdit.setPlainText(t)
            self.plainTextEdit.textChanged.connect(self.format)
            if end == 0:
                Cursor.setPosition(P)  # 光标归位
            else:
                Cursor.movePosition(QTextCursor.End)
            self.plainTextEdit.setTextCursor(Cursor)
            if time() - self.LST >= 10:
                self.Save()
                self.LST = time()
        except Exception as E:
            InfoBar.error(
                title='ERROR!',
                content=str(E),
                orient=Qt.Horizontal,
                isClosable=True,
                position=InfoBarPosition.TOP,
                duration=2000,
                parent=self
            )


if __name__ == '__main__':
    app = QApplication([])
    window = MainWindow()
    window.show()
    app.exec()
