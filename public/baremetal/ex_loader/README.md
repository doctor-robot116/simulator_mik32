# Пример загрузчика: состояние для примера :)

***

## Сборка
```
make
```

## Заливка
Так как заливаем в EEPROM, то используем mik32_uploader  
У меня строка для запуска загрузчика выглядит примерно так:  
```
python3 ~/Документы/ACE-UNO/mik32-ide_edit/tools/mik32-uploader/mik32_upload.py --run-openocd --openocd-host=127.0.0.1  --adapter-speed=2000 --openocd-exec=openocd --openocd-interface=/usr/share/openocd/scripts/interface/jlink.cfg --openocd-scripts=/home/vzaytsev/Документы/ACE-UNO/mik32-ide_edit/tools/mik32-uploader/openocd-scripts --openocd-target=/home/vzaytsev/Документы/ACE-UNO/mik32-ide_edit/tools/mik32-uploader/openocd-scripts/target/mik32.cfg --boot-mode=eeprom ./out.hex
```
