.PHONY: clean

OPT_FLAGS_SPEED  = -Ofast -s -flto -ffat-lto-objects
OPT_FLAGS_SIZE   = -Os -s -flto -ffat-lto-objects
OPT_FLAGS_DEBUG  = -O0 -g
OPT_FLAGS_COMMON = -march=rv32imc_zicsr -mabi=ilp32 -ffunction-sections -fdata-sections -fstrict-volatile-bitfields -fno-strict-aliasing -fno-common -nostartfiles -ffreestanding -nostdlib -nodefaultlibs


all: speed
debug: out.hex
size: out.hex
speed: out.hex

debug: OPT_FLAGS = $(OPT_FLAGS_DEBUG)
size: OPT_FLAGS = $(OPT_FLAGS_SIZE)
speed: OPT_FLAGS = $(OPT_FLAGS_SPEED)
upload: OPT_FLAGS = $(OPT_FLAGS_SPEED)

debug: LC_TGT = debug
size: LC_TGT = size
speed: LC_TGT = speed
upload: LC_TGT = speed

debug: LD_SCRIPT = ram.ld
size: LD_SCRIPT = spifi.ld
speed: LD_SCRIPT = spifi.ld
upload: LD_SCRIPT = spifi.ld


out.hex: out.elf
	riscv64-unknown-elf-objcopy -O ihex out.elf out.hex
	riscv64-unknown-elf-objcopy -O binary out.elf out.bin
	riscv64-unknown-elf-size out.elf


out.elf: ../libbaremetal/lib/libc.a ../libbaremetal/lib/libm.a main.c ../devices/xpt2046.c
	riscv64-unknown-elf-gcc -DMIK32V2 \
			main.c \
			../images/0_.tga.c \
			../images/1_.tga.c \
			../images/2_.tga.c \
			../images/3_.tga.c \
			../images/4_.tga.c \
			../images/5_.tga.c \
			../images/6_.tga.c \
			../images/7_.tga.c \
			../images/8_.tga.c \
			../images/9_.tga.c \
			../images/clock00.tga.c \
			../images/clock01.tga.c \
			../images/clock02.tga.c \
			../images/clock03.tga.c \
			../images/clock04.tga.c \
			../images/clock05.tga.c \
			../images/clock06.tga.c \
			../images/clock07.tga.c \
			../images/clock08.tga.c \
			../images/clock09.tga.c \
			../images/clock10.tga.c \
			../images/clock11.tga.c \
			../images/clock12.tga.c \
			../images/clock13.tga.c \
			../images/clock14.tga.c \
			../images/clock15.tga.c \
			../images/clock16.tga.c \
			../images/ind_on.tga.c \
			../images/ind_off.tga.c \
			../images/action_pressed.c \
			../images/action_released.c \
			../images/minus_pressed.c \
			../images/minus_released.c \
			../images/plus_pressed.c \
			../images/plus_released.c \
			../devices/display.c \
			../devices/ili9341.c \
			../devices/xpt2046.c \
			../fonts/font_25_30.c \
			../fonts/font_bmp.c \
			../utils/zic_utils.c \
			-I../libbaremetal/include \
			-I../devices \
			-I../fonts \
			-I../utils \
			-I../images \
			-I../ \
			$(OPT_FLAGS) \
			$(OPT_FLAGS_COMMON) \
			-Wall -Wextra \
			-Wl,-T,../ld_scripts/$(LD_SCRIPT),-Map,out.elf.map,-gc-sections,--print-memory-usage \
			-L../libbaremetal/lib \
			-lc -lgcc \
			-o out.elf

../libbaremetal/lib/libc.a:
	$(MAKE) $(LC_TGT) -C ../libbaremetal

../libbaremetal/lib/libm.a:
	$(MAKE) $(LC_TGT) -C ../libbaremetal


upload: out.hex ../tools/ex_uploader
	../tools/ex_uploader /dev/ttyUSB0 ./out.bin
	
	
ex_uploader: ../tools/ex_uploader.c
	gcc ../tools/ex_uploader.c -O2 -s -Wall -Wextra -o ../tools/ex_uploader


clean:
	rm -f *.map \
	      *.hex \
	      *.elf \
	      *.bin \
	      ../tools/ex_uploader
	$(MAKE) -C ../libbaremetal clean
