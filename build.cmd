for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "version=%dt:~0,8%.%dt:~8,6%"
docker build -t harbor-in.99.com/nd-design-ai/ai-chat:%version% .
docker push harbor-in.99.com/nd-design-ai/ai-chat:%version%
