OUTPUT_FORMAT("elf32-littleriscv", "elf32-littleriscv", "elf32-littleriscv")
OUTPUT_ARCH(riscv)
ENTRY(_start)
MEMORY {
  ram (RWX): ORIGIN = 0x02000000, LENGTH = 16K
}
STACK_SIZE = 512;
CL_SIZE = 16;
REGION_ALIAS("REGION_TEXT", ram);
REGION_ALIAS("REGION_RAM", ram);

SECTIONS {
    .text ORIGIN(REGION_TEXT) : {
        PROVIDE(__TEXT_START__ = .);
        # _gp = .;
        # код из crt0.S помещаем в начало сегмента REGION_TEXT, здесь точка входа из сброса
        *crt0.o(.text .text.*)
        # по смещению 0xC0 (абсолютный адрес 0x20000C0)
        # складываем секцию с обработчиком прерываний, секция объявлена через KEEP()
        # чтобы линкер не отбросил её по флагу -gc-sections (т.к. нет вызова функции trap_handler())
        # отсюда !ВНИМАНИЕ! - размер кода в crt0.S не должен превышать 192 (0xC0) байта (правда, линкер выругается, если что)
        . = ORIGIN(ram) + 0xC0;
        KEEP (*(.trap_handler_ram))
        *(.text.smallsysteminit)
        *(.text.SmallSystemInit)
        *(.text)
        *(.text.*)
        *(.rodata)
        *(.rodata.*)
        
        # секции для вызова конструкторов, если код на плюсах и есть глобальные объекты,
        # которые требуют вызов конструкторов
        . = ALIGN(CL_SIZE);
        PROVIDE_HIDDEN ( __preinit_array_start = . );
        KEEP (*(.preinit_array))
        PROVIDE_HIDDEN ( __preinit_array_end = . );

        . = ALIGN(CL_SIZE);
        PROVIDE_HIDDEN ( __init_array_start = . );
        KEEP (*(SORT_BY_INIT_PRIORITY(.init_array.*) SORT_BY_INIT_PRIORITY(.ctors.*)))
        KEEP (*(.init_array .ctors))
        PROVIDE_HIDDEN ( __init_array_end = . );

        . = ALIGN(CL_SIZE);
        PROVIDE(__TEXT_END__ = .);
    } >REGION_TEXT
    .data :
    AT( __TEXT_END__ ) {
        PROVIDE(__DATA_START__ = .);
        . = ALIGN(CL_SIZE);
        *(.ram_text)
        . = ALIGN(CL_SIZE);
        *(.srodata.cst16) *(.srodata.cst8) *(.srodata.cst4) *(.srodata.cst2) *(.srodata*)
        __global_pointer$ = . + 0x800;
        *(.sdata .sdata.* .gnu.linkonce.s.*)
        *(.data .data.*)
        . = ALIGN(CL_SIZE);
        PROVIDE(__DATA_END__ = .);
    } >REGION_RAM

    __DATA_IMAGE_START__ = 0;
    __DATA_IMAGE_END__ = 0;
    /* thread-local data segment */
    .tdata : {
        PROVIDE(_tls_data = .);
        PROVIDE(_tdata_begin = .);
        *(.tdata .tdata.*)
        PROVIDE(_tdata_end = .);
        . = ALIGN(CL_SIZE);
    } >REGION_RAM
    .tbss : {
        PROVIDE(__BSS_START__ = .);
        *(.tbss .tbss.*)
        . = ALIGN(CL_SIZE);
        PROVIDE(_tbss_end = .);
    } >REGION_RAM
    /* bss segment */
    .sbss : {
        *(.sbss .sbss.* .gnu.linkonce.sb.*)
        *(.scommon)
    } >REGION_RAM
    .bss : {
        *(.bss .bss.*)
        *(COMMON)
        . = ALIGN(CL_SIZE);
        PROVIDE(__BSS_END__ = .);
    } >REGION_RAM
    _end = .;
    PROVIDE(__end = .);
    /* End of uninitalized data segement */
    .stack ORIGIN(REGION_RAM) + LENGTH(REGION_RAM) - STACK_SIZE : {
        FILL(0);
        PROVIDE(__STACK_START__ = .);
        . += STACK_SIZE;
        PROVIDE(__C_STACK_TOP__ = .);
        PROVIDE(__STACK_END__ = .);
    } >REGION_RAM
    /DISCARD/ : {
        *(.eh_frame .eh_frame.*)
    }
}
