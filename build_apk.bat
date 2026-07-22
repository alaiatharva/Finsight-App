@echo off
cls
echo ===================================================
echo FinSight Android APK Builder
echo ===================================================
echo.
echo Please select the type of APK you want to build:
echo [1] Release APK (Optimized, Hermes-enabled, Production behavior)
echo [2] Debug APK (Development behavior)
echo [3] Clean build cache (Force kills Java ^& clears locks)
echo [4] Force Kill Java/Gradle Processes (Fixes frozen lock issues)
echo [5] Full Clean Rebuild (Wipes android dir, Metro cache, and rebuilds Release)
echo [6] Exit
echo.
set /p opt="Enter choice (1-6): "

set PROJECT_DIR=%~dp0
set ANDROID_DIR=%PROJECT_DIR%android

REM Load environment variables from .env file to ensure variables like EXPO_PUBLIC_GEMINI_API_KEY are baked into the build
if exist "%PROJECT_DIR%.env" (
    echo Loading environment variables from .env file...
    for /f "usebackq tokens=1,2 delims==" %%i in ("%PROJECT_DIR%.env") do (
        echo %%i | findstr /R "^#" >nul
        if errorlevel 1 (
            set "%%i=%%j"
        )
    )
)

REM Automatically detect and configure ANDROID_HOME if not already defined in the environment
if "%ANDROID_HOME%"=="" (
    if exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk" (
        set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
        echo Detected Android SDK at: C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    ) else (
        echo WARNING: ANDROID_HOME environment variable is not set and Android SDK was not found in the default location.
    )
)

REM Automatically detect and configure JAVA_HOME to Android Studio's bundled JBR to avoid JDK 26 incompatibilities with Gradle
if exist "C:\Program Files\Android\Android Studio\jbr" (
    set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
    echo Detected and set JAVA_HOME to Android Studio JBR: C:\Program Files\Android\Android Studio\jbr
) else (
    echo WARNING: Android Studio JBR not found. Using system default Java environment.
)

REM Increase JVM Heap and Metaspace sizes to prevent Gradle Daemon Out Of Memory crashes
set _JAVA_OPTIONS=-Xmx2g -XX:MaxMetaspaceSize=512m
set GRADLE_OPTS=-Dorg.gradle.jvmargs="-Xmx2g -XX:MaxMetaspaceSize=512m"
REM Limit parallel compilation threads for native C++ (CMake/Ninja) to prevent clang++ Out Of Memory crashes
set CMAKE_BUILD_PARALLEL_LEVEL=2

if "%opt%"=="1" goto build_release
if "%opt%"=="2" goto build_debug
if "%opt%"=="3" goto clean_cache
if "%opt%"=="4" goto force_kill
if "%opt%"=="5" goto full_clean_rebuild
if "%opt%"=="6" goto end
goto invalid

:build_release
echo.
echo ===================================================
echo Building Release APK...
echo ===================================================
cd /d "%PROJECT_DIR%"
echo Checking node_modules...
if not exist "%PROJECT_DIR%node_modules" (
    echo node_modules not found. Installing dependencies...
    call npm install
)
echo Syncing Expo configuration with native project (prebuild)...
call npx expo prebuild --platform android --no-install
if %ERRORLEVEL% neq 0 (
    echo.
    echo ===================================================
    echo EXPO PREBUILD FAILED! Please check error logs.
    echo ===================================================
    goto end
)
cd /d "%ANDROID_DIR%"
cmd /c gradlew.bat assembleRelease --max-workers=2 -x lint -x lintVitalRelease -x lintVitalAnalyzeRelease
if %ERRORLEVEL% equ 0 (
    if not exist "%PROJECT_DIR%builds" mkdir "%PROJECT_DIR%builds"
    copy /y "%ANDROID_DIR%\app\build\outputs\apk\release\app-release.apk" "%PROJECT_DIR%builds\FinSight-release.apk"
    echo.
    echo ===================================================
    echo BUILD SUCCESSFUL!
    echo APK copied to: %PROJECT_DIR%builds\FinSight-release.apk
    echo ===================================================
) else (
    echo.
    echo ===================================================
    echo BUILD FAILED! Please check error logs above.
    echo ===================================================
)
goto end

:build_debug
echo.
echo ===================================================
echo Building Debug APK...
echo ===================================================
cd /d "%PROJECT_DIR%"
echo Checking node_modules...
if not exist "%PROJECT_DIR%node_modules" (
    echo node_modules not found. Installing dependencies...
    call npm install
)
echo Syncing Expo configuration with native project (prebuild)...
call npx expo prebuild --platform android --no-install
if %ERRORLEVEL% neq 0 (
    echo.
    echo ===================================================
    echo EXPO PREBUILD FAILED! Please check error logs.
    echo ===================================================
    goto end
)
cd /d "%ANDROID_DIR%"
cmd /c gradlew.bat assembleDebug --max-workers=2 -x lint -x lintVitalDebug -x lintVitalAnalyzeDebug
if %ERRORLEVEL% equ 0 (
    if not exist "%PROJECT_DIR%builds" mkdir "%PROJECT_DIR%builds"
    copy /y "%ANDROID_DIR%\app\build\outputs\apk\debug\app-debug.apk" "%PROJECT_DIR%builds\FinSight-debug.apk"
    echo.
    echo ===================================================
    echo BUILD SUCCESSFUL!
    echo APK copied to: %PROJECT_DIR%builds\FinSight-debug.apk
    echo ===================================================
) else (
    echo.
    echo ===================================================
    echo BUILD FAILED! Please check error logs above.
    echo ===================================================
)
goto end

:clean_cache
echo.
echo ===================================================
echo Cleaning Build Cache and Releasing Locks...
echo ===================================================
echo Force killing all java.exe processes to release cache locks...
taskkill /F /IM java.exe 2>nul
cd /d "%PROJECT_DIR%"
echo Checking node_modules...
if not exist "%PROJECT_DIR%node_modules" (
    echo node_modules not found. Installing dependencies...
    call npm install
)
echo Cleaning native android directory and regenerating...
call npx expo prebuild --platform android --clean --no-install
if %ERRORLEVEL% neq 0 (
    echo.
    echo ===================================================
    echo EXPO CLEAN PREBUILD FAILED! Please check error logs.
    echo ===================================================
    goto end
)
cd /d "%ANDROID_DIR%"
call gradlew.bat --stop
call gradlew.bat clean
echo Clean completed successfully.
goto end

:force_kill
echo.
echo ===================================================
echo Force Killing Gradle/Java Processes...
echo ===================================================
taskkill /F /IM java.exe 2>nul
echo All java.exe processes have been forcefully terminated.
echo Stale cache locks should now be released.
goto end

:full_clean_rebuild
echo.
echo ===================================================
echo Full Clean Rebuild (Release APK)
echo ===================================================
echo Step 1/5: Force killing all java.exe processes...
taskkill /F /IM java.exe 2>nul
cd /d "%PROJECT_DIR%"
echo Step 2/5: Clearing Metro bundler cache...
if exist "%PROJECT_DIR%node_modules\.cache" (
    rmdir /s /q "%PROJECT_DIR%node_modules\.cache" 2>nul
)
if exist "%TEMP%\metro-*" (
    for /d %%i in ("%TEMP%\metro-*") do rmdir /s /q "%%i" 2>nul
)
if exist "%TEMP%\haste-map-*" (
    for /d %%i in ("%TEMP%\haste-map-*") do rmdir /s /q "%%i" 2>nul
)
echo Step 3/5: Checking node_modules...
if not exist "%PROJECT_DIR%node_modules" (
    echo node_modules not found. Installing dependencies...
    call npm install
)
echo Step 4/5: Clean prebuild (wipes android dir and regenerates from app.json)...
call npx expo prebuild --platform android --clean --no-install
if %ERRORLEVEL% neq 0 (
    echo.
    echo ===================================================
    echo EXPO CLEAN PREBUILD FAILED! Please check error logs.
    echo ===================================================
    goto end
)
echo Step 5/5: Building Release APK...
cd /d "%ANDROID_DIR%"
cmd /c gradlew.bat assembleRelease --max-workers=2 -x lint -x lintVitalRelease -x lintVitalAnalyzeRelease
if %ERRORLEVEL% equ 0 (
    if not exist "%PROJECT_DIR%builds" mkdir "%PROJECT_DIR%builds"
    copy /y "%ANDROID_DIR%\app\build\outputs\apk\release\app-release.apk" "%PROJECT_DIR%builds\FinSight-release.apk"
    echo.
    echo ===================================================
    echo FULL CLEAN REBUILD SUCCESSFUL!
    echo APK copied to: %PROJECT_DIR%builds\FinSight-release.apk
    echo ===================================================
) else (
    echo.
    echo ===================================================
    echo BUILD FAILED! Please check error logs above.
    echo ===================================================
)
goto end

:invalid
echo Invalid choice.
goto end

:end
echo.
pause
