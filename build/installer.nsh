!include LogicLib.nsh

!macro customInit
  ; 自定义安装前的初始化代码
  !define APP_DATA_FOLDER "$APPDATA\inventory-management-system"
!macroend

!macro customInstall
  ; 自定义安装过程
  SetOutPath "$INSTDIR"
  
  ; 创建应用数据备份目录
  CreateDirectory "${APP_DATA_FOLDER}"
  CreateDirectory "${APP_DATA_FOLDER}\backups"
  
  ; 如果是更新安装，备份现有的数据库文件
  IfFileExists "$APPDATA\inventory-management-system\inventory.db" 0 +3
    CreateDirectory "${APP_DATA_FOLDER}\backups"
    CopyFiles "$APPDATA\inventory-management-system\inventory.db" "${APP_DATA_FOLDER}\backups\inventory.db.backup"
    
  ; 如果是更新安装，备份现有的图片文件夹
  IfFileExists "$APPDATA\inventory-management-system\images" 0 +2
    CopyFiles /SILENT "$APPDATA\inventory-management-system\images\*.*" "${APP_DATA_FOLDER}\backups\images\"
!macroend

!macro customUnInstall
  ; 卸载时询问是否保留用户数据
  MessageBox MB_YESNO|MB_ICONQUESTION "是否保留用户数据？（数据库、图片等）$\n$\n选择'是'将保留所有数据$\n选择'否'将删除所有数据" IDYES KeepUserData
  
  ; 用户选择"否"，执行删除操作
  DetailPrint "正在删除用户数据..."
  
  ; 使用绝对路径删除数据文件夹
  SetShellVarContext current
  
  ; 先尝试删除子文件
  RMDir /r "$APPDATA\inventory-management-system\images"
  Delete "$APPDATA\inventory-management-system\inventory.db"
  Delete "$APPDATA\inventory-management-system\*.db"
  Delete "$APPDATA\inventory-management-system\*.log"
  
  ; 然后删除主文件夹
  RMDir /r "$APPDATA\inventory-management-system"
  
  DetailPrint "用户数据已删除"
  Goto UninstallDone
  
  KeepUserData:
    DetailPrint "保留用户数据"
  
  UninstallDone:
!macroend 