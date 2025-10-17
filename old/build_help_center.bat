@echo off

Setlocal EnableDelayedExpansion
set SUPERSAM=%1

set SOURCE=%2
set OUTPUT=%3

IF NOT DEFINED SOURCE set SOURCE=C:\HelpCenter\help_test\MagoCloud-HelpCenter.prjsam
IF NOT DEFINED OUTPUT set OUTPUT=C:\HelpCenter\help_test\output

%SUPERSAM% -cli %SOURCE% %OUTPUT% -log=%OUTPUT%/buildLog.log --l4j-no-splash 