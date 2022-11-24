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
from PySide6.QtWidgets import (QApplication, QFontComboBox, QHBoxLayout, QLabel,
    QLineEdit, QMainWindow, QMenuBar, QPlainTextEdit,
    QPushButton, QSizePolicy, QSlider, QStatusBar,
    QVBoxLayout, QWidget)

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
        self.horizontalLayout = QHBoxLayout()
        self.horizontalLayout.setObjectName(u"horizontalLayout")
        self.label = QLabel(self.centralwidget)
        self.label.setObjectName(u"label")
        self.label.setMaximumSize(QSize(67, 16777215))

        self.horizontalLayout.addWidget(self.label)

        self.Slider = QSlider(self.centralwidget)
        self.Slider.setObjectName(u"Slider")
        self.Slider.setMaximum(200)
        self.Slider.setOrientation(Qt.Horizontal)

        self.horizontalLayout.addWidget(self.Slider)

        self.maxlength = QLabel(self.centralwidget)
        self.maxlength.setObjectName(u"maxlength")

        self.horizontalLayout.addWidget(self.maxlength)

        self.fontComboBox = QFontComboBox(self.centralwidget)
        self.fontComboBox.setObjectName(u"fontComboBox")
        self.fontComboBox.setMaximumSize(QSize(141, 22))
        font = QFont()
        font.setFamilies([u"Cascadia Mono SemiLight"])
        font.setPointSize(14)
        self.fontComboBox.setCurrentFont(font)

        self.horizontalLayout.addWidget(self.fontComboBox)

        self.horizontalSlider = QSlider(self.centralwidget)
        self.horizontalSlider.setObjectName(u"horizontalSlider")
        self.horizontalSlider.setMaximumSize(QSize(100000, 22))
        self.horizontalSlider.setMinimum(1)
        self.horizontalSlider.setOrientation(Qt.Horizontal)

        self.horizontalLayout.addWidget(self.horizontalSlider)


        self.verticalLayout.addLayout(self.horizontalLayout)

        self.plainTextEdit = QPlainTextEdit(self.centralwidget)
        self.plainTextEdit.setObjectName(u"plainTextEdit")
        font1 = QFont()
        font1.setFamilies([u"Cascadia Mono SemiLight"])
        font1.setPointSize(16)
        self.plainTextEdit.setFont(font1)

        self.verticalLayout.addWidget(self.plainTextEdit)

        self.horizontalLayout_2 = QHBoxLayout()
        self.horizontalLayout_2.setObjectName(u"horizontalLayout_2")
        self.label_2 = QLabel(self.centralwidget)
        self.label_2.setObjectName(u"label_2")

        self.horizontalLayout_2.addWidget(self.label_2)

        self.lineEdit = QLineEdit(self.centralwidget)
        self.lineEdit.setObjectName(u"lineEdit")

        self.horizontalLayout_2.addWidget(self.lineEdit)

        self.Open = QPushButton(self.centralwidget)
        self.Open.setObjectName(u"Open")

        self.horizontalLayout_2.addWidget(self.Open)

        self.Save = QPushButton(self.centralwidget)
        self.Save.setObjectName(u"Save")

        self.horizontalLayout_2.addWidget(self.Save)


        self.verticalLayout.addLayout(self.horizontalLayout_2)

        MainWindow.setCentralWidget(self.centralwidget)
        self.menubar = QMenuBar(MainWindow)
        self.menubar.setObjectName(u"menubar")
        self.menubar.setGeometry(QRect(0, 0, 798, 22))
        MainWindow.setMenuBar(self.menubar)
        self.statusbar = QStatusBar(MainWindow)
        self.statusbar.setObjectName(u"statusbar")
        MainWindow.setStatusBar(self.statusbar)
        QWidget.setTabOrder(self.Slider, self.plainTextEdit)
        QWidget.setTabOrder(self.plainTextEdit, self.Save)
        QWidget.setTabOrder(self.Save, self.Open)
        QWidget.setTabOrder(self.Open, self.lineEdit)

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

