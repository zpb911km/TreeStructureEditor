# -*- coding: utf-8 -*-

################################################################################
## Form generated from reading UI file 'untitled.ui'
##
## Created by: Qt User Interface Compiler version 6.4.2
##
## WARNING! All changes made in this file will be lost when recompiling UI file!
################################################################################

from PySide6.QtCore import (QCoreApplication, QDate, QDateTime, QLocale,
    QMetaObject, QObject, QPoint, QRect,
    QSize, QTime, QUrl, Qt)
from PySide6.QtGui import (QBrush, QColor, QConicalGradient, QCursor,
    QFont, QFontDatabase, QGradient, QIcon,
    QImage, QKeySequence, QLinearGradient, QPainter,
    QPalette, QPixmap, QRadialGradient, QTransform)
from PySide6.QtWidgets import (QApplication, QHBoxLayout, QLabel, QLineEdit,
    QMainWindow, QMenuBar, QPlainTextEdit, QPushButton,
    QSizePolicy, QSlider, QStatusBar, QVBoxLayout,
    QWidget)

class Ui_MainWindow(object):
    def setupUi(self, MainWindow):
        if not MainWindow.objectName():
            MainWindow.setObjectName(u"MainWindow")
        MainWindow.resize(798, 577)
        icon = QIcon()
        icon.addFile(u"\"E:/myfiles/python/symbol.png\"", QSize(), QIcon.Normal, QIcon.Off)
        MainWindow.setWindowIcon(icon)
        self.centralwidget = QWidget(MainWindow)
        self.centralwidget.setObjectName(u"centralwidget")
        self.verticalLayout = QVBoxLayout(self.centralwidget)
        self.verticalLayout.setObjectName(u"verticalLayout")
        self.horizontalLayout_2 = QHBoxLayout()
        self.horizontalLayout_2.setObjectName(u"horizontalLayout_2")
        self.label = QLabel(self.centralwidget)
        self.label.setObjectName(u"label")
        self.label.setMaximumSize(QSize(67, 16777215))

        self.horizontalLayout_2.addWidget(self.label)

        self.Slider = QSlider(self.centralwidget)
        self.Slider.setObjectName(u"Slider")
        self.Slider.setMaximum(200)
        self.Slider.setOrientation(Qt.Horizontal)

        self.horizontalLayout_2.addWidget(self.Slider)

        self.maxlength = QLabel(self.centralwidget)
        self.maxlength.setObjectName(u"maxlength")

        self.horizontalLayout_2.addWidget(self.maxlength)


        self.verticalLayout.addLayout(self.horizontalLayout_2)

        self.plainTextEdit = QPlainTextEdit(self.centralwidget)
        self.plainTextEdit.setObjectName(u"plainTextEdit")
        font = QFont()
        font.setFamilies([u"Cascadia Mono"])
        font.setPointSize(16)
        font.setBold(False)
        self.plainTextEdit.setFont(font)

        self.verticalLayout.addWidget(self.plainTextEdit)

        self.horizontalLayout = QHBoxLayout()
        self.horizontalLayout.setObjectName(u"horizontalLayout")
        self.label_2 = QLabel(self.centralwidget)
        self.label_2.setObjectName(u"label_2")

        self.horizontalLayout.addWidget(self.label_2)

        self.lineEdit = QLineEdit(self.centralwidget)
        self.lineEdit.setObjectName(u"lineEdit")

        self.horizontalLayout.addWidget(self.lineEdit)

        self.Open = QPushButton(self.centralwidget)
        self.Open.setObjectName(u"Open")

        self.horizontalLayout.addWidget(self.Open)

        self.Save = QPushButton(self.centralwidget)
        self.Save.setObjectName(u"Save")

        self.horizontalLayout.addWidget(self.Save)


        self.verticalLayout.addLayout(self.horizontalLayout)

        MainWindow.setCentralWidget(self.centralwidget)
        self.menubar = QMenuBar(MainWindow)
        self.menubar.setObjectName(u"menubar")
        self.menubar.setGeometry(QRect(0, 0, 798, 22))
        MainWindow.setMenuBar(self.menubar)
        self.statusbar = QStatusBar(MainWindow)
        self.statusbar.setObjectName(u"statusbar")
        MainWindow.setStatusBar(self.statusbar)

        self.retranslateUi(MainWindow)

        QMetaObject.connectSlotsByName(MainWindow)
    # setupUi

    def retranslateUi(self, MainWindow):
        MainWindow.setWindowTitle(QCoreApplication.translate("MainWindow", u"format", None))
        self.label.setText(QCoreApplication.translate("MainWindow", u"\u6700\u5927\u957f\u5ea6:", None))
        self.maxlength.setText(QCoreApplication.translate("MainWindow", u"TextLabel", None))
        self.plainTextEdit.setPlainText("")
        self.label_2.setText(QCoreApplication.translate("MainWindow", u"\u63d0\u793a\uff1a", None))
        self.Open.setText(QCoreApplication.translate("MainWindow", u"\u6253\u5f00", None))
        self.Save.setText(QCoreApplication.translate("MainWindow", u"\u4fdd\u5b58", None))
    # retranslateUi

