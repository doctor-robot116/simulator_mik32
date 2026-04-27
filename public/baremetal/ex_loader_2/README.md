## Пример загрузчика 2
Работает по собственному протоколу, через UART_0, который на плате ELBEAR ACE-UNO подключен к мосту USB<->UART.  
После запуска ожидает восьмибайтовый "заголовок": четыре байта размера (LE) и 4 байта CRC32/POSIX (LE).  
Ожидание длится 500 миллисекунд или пока на входе PORT2.6 фиксируется лог. 1  
Если заголовка нет, управление передаётся коду из SPI FLASH, с адреса 0x80000000.  
После принятого заголовка ожидается "прошивка" порциями по 4096 байтов, после каждой принятой порции отправляет один байт подтверждения или 1-байтовый код ошибки.  
Приём от UART_0 идёт через DMA. Запись в SPIFI контроллер - тоже.  
CRC32/POSIX для принятых данных подсчитывается по мере поступления блоков.  
После приёма и записи последнего блока расчитанное значение CRC сверяется со значением из "заголовка", если совпало - "прошивка" запускается.  
Программа для загрузки "прошивки" в SPI FLash находится в tools/ex_uploader.c  
"Прошивка" для помещения в SPI Flash должна быть в "бинарном" виде (для преобразования ELF файла в "бинарный" формат можно использовать команду riscv64-unknown-elf-objcopy -O binary out.elf out.bin).  

***

### Сборка
```
make
```

### Заливка
Так как заливаем в EEPROM, то используем mik32_uploader  
У меня строка для запуска загрузчика выглядит примерно так:  
```
python3 ~/Документы/ACE-UNO/mik32-ide_edit/tools/mik32-uploader/mik32_upload.py --run-openocd --openocd-host=127.0.0.1  --adapter-speed=2000 --openocd-exec=openocd --openocd-interface=/usr/share/openocd/scripts/interface/jlink.cfg --openocd-scripts=/home/vzaytsev/Документы/ACE-UNO/mik32-ide_edit/tools/mik32-uploader/openocd-scripts --openocd-target=/home/vzaytsev/Документы/ACE-UNO/mik32-ide_edit/tools/mik32-uploader/openocd-scripts/target/mik32.cfg --boot-mode=eeprom ./out.hex
```
