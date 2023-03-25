# -*- coding: utf-8 -*-

################################################################################
## Form generated from reading UI file 'GUI.ui'
##
## Created by: Qt User Interface Compiler version 5.15.2
##
## WARNING! All changes made in this file will be lost when recompiling UI file!
################################################################################

from PySide2.QtCore import *
from PySide2.QtGui import *
from PySide2.QtWidgets import *


class Ui_MainWindow(object):
    def setupUi(self, MainWindow):
        if not MainWindow.objectName():
            MainWindow.setObjectName(u"MainWindow")
        MainWindow.resize(857, 710)
        self.horizontalLayout = QHBoxLayout(MainWindow)
        self.horizontalLayout.setObjectName(u"horizontalLayout")
        self.horizontalSpacer = QSpacerItem(20, 20, QSizePolicy.Preferred, QSizePolicy.Minimum)

        self.horizontalLayout.addItem(self.horizontalSpacer)

        self.InputPart = QVBoxLayout()
        self.InputPart.setObjectName(u"InputPart")
        self.verticalSpacer = QSpacerItem(20, 20, QSizePolicy.Minimum, QSizePolicy.Preferred)

        self.InputPart.addItem(self.verticalSpacer)

        self.InputBox = QPlainTextEdit(MainWindow)
        self.InputBox.setObjectName(u"InputBox")
        self.InputBox.viewport().setProperty("cursor", QCursor(Qt.IBeamCursor))

        self.InputPart.addWidget(self.InputBox)

        self.verticalSpacer_2 = QSpacerItem(20, 20, QSizePolicy.Minimum, QSizePolicy.Preferred)

        self.InputPart.addItem(self.verticalSpacer_2)


        self.horizontalLayout.addLayout(self.InputPart)

        self.TransformationButton = QPushButton(MainWindow)
        self.TransformationButton.setObjectName(u"TransformationButton")
        self.TransformationButton.setCursor(QCursor(Qt.PointingHandCursor))

        self.horizontalLayout.addWidget(self.TransformationButton)

        self.OutputPart = QVBoxLayout()
        self.OutputPart.setObjectName(u"OutputPart")
        self.verticalSpacer_3 = QSpacerItem(20, 20, QSizePolicy.Minimum, QSizePolicy.Preferred)

        self.OutputPart.addItem(self.verticalSpacer_3)

        self.OutputBox = QPlainTextEdit(MainWindow)
        self.OutputBox.setObjectName(u"OutputBox")
        self.OutputBox.viewport().setProperty("cursor", QCursor(Qt.IBeamCursor))
        self.OutputBox.setReadOnly(True)

        self.OutputPart.addWidget(self.OutputBox)

        self.verticalSpacer_4 = QSpacerItem(20, 20, QSizePolicy.Minimum, QSizePolicy.Preferred)

        self.OutputPart.addItem(self.verticalSpacer_4)


        self.horizontalLayout.addLayout(self.OutputPart)

        self.horizontalSpacer_2 = QSpacerItem(20, 20, QSizePolicy.Preferred, QSizePolicy.Minimum)

        self.horizontalLayout.addItem(self.horizontalSpacer_2)


        self.retranslateUi(MainWindow)

        QMetaObject.connectSlotsByName(MainWindow)
    # setupUi

    def retranslateUi(self, MainWindow):
        MainWindow.setWindowTitle(QCoreApplication.translate("MainWindow", u"Form", None))
        self.InputBox.setPlaceholderText(QCoreApplication.translate("MainWindow", u"\u5728\u6b64\u8f93\u5165\u2026\u2026", None))
        self.TransformationButton.setText(QCoreApplication.translate("MainWindow", u"\u8f6c\u6362", None))
    # retranslateUi

