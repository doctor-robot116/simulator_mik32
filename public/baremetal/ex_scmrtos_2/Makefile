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


out.elf: ../libbaremetal/lib/libc.a ../libbaremetal/lib/libm.a main.cpp
	riscv64-unknown-elf-g++ -DMIK32V2 \
	    ../scmrtos/port/mik32/os_target.S \
	    ../scmrtos/port/mik32/os_target.cpp \
	    ../scmrtos/core/os_kernel.cpp \
	    ../scmrtos/core/os_services.cpp \
	    ../scmrtos/core/usrlib.cpp \
			main.cpp \
			-I. \
			-I../scmrtos/core \
			-I../scmrtos/port/mik32 \
			-I../libbaremetal/include \
			-I.. \
			$(OPT_FLAGS) \
			$(OPT_FLAGS_COMMON) \
			-Wall -Wextra \
			-fno-rtti -fno-exceptions \
			-Wl,-T,../ld_scripts/$(LD_SCRIPT),-Map,out.elf.map,-gc-sections,--print-memory-usage \
			-L../libbaremetal/lib \
			-lc \
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
