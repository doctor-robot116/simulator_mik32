#include <mik32_hwlibs/mik32_memory_map.h>
#include <mik32_hwlibs/power_manager.h>
#include <mik32_hwlibs/wakeup.h>
#include <mik32_hwlibs/gpio.h>
#include <mik32_hwlibs/pad_config.h>
#include <mik32_hwlibs/epic.h>
#include <mik32_hwlibs/timer32.h>
#include <mik32_hwlibs/csr.h>
#include <mik32_hwlibs/scr1_csr_encoding.h>
#include <mik32_hwlibs/scr1_timer.h>
#include <mik32_hwlibs/uart.h>
#include <mik32_hwlibs/crypto.h>
#include "kuznets.h"
#include "magma.h"

#include <runtime.h>
#include <blake2.h>
#include <aes_128.h>
#include <stdio.h>
#include <string.h>
#include <endian.h>
#include <stdbool.h>
#include <stdlib.h>


static const uint8_t g_b2_text[27] = {
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f
, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a
};

static const uint8_t g_b2_key[64] = {
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f
, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f
, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f
};

static const uint8_t g_b2s_hash[32] = {
  0x26, 0xcd, 0x66, 0xfc, 0xa0, 0x23, 0x79, 0xc7, 0x6d, 0xf1, 0x23, 0x17, 0x05, 0x2b, 0xca, 0xfd
, 0x6c, 0xd8, 0xc3, 0xa7, 0xb8, 0x90, 0xd8, 0x05, 0xf3, 0x6c, 0x49, 0x98, 0x97, 0x82, 0x43, 0x3a
};

static const uint8_t g_b2b_hash[64] = {
  0x86, 0xa2, 0xaf, 0x31, 0x6e, 0x7d, 0x77, 0x54, 0x20, 0x1b, 0x94, 0x2e, 0x27, 0x53, 0x64, 0xac
, 0x12, 0xea, 0x89, 0x62, 0xab, 0x5b, 0xd8, 0xd7, 0xfb, 0x27, 0x6d, 0xc5, 0xfb, 0xff, 0xc8, 0xf9
, 0xa2, 0x8c, 0xae, 0x4e, 0x48, 0x67, 0xdf, 0x67, 0x80, 0xd9, 0xb7, 0x25, 0x24, 0x16, 0x09, 0x27
, 0xc8, 0x55, 0xda, 0x5b, 0x60, 0x78, 0xe0, 0xb5, 0x54, 0xaa, 0x91, 0xe3, 0x1c, 0xb9, 0xca, 0x1d
};


static const char * g_b2b_str = "The quick brown fox jumps over the lazy dog";

static const uint8_t g_b2b_strhash[64] = {
  0xa8, 0xad, 0xd4, 0xbd, 0xdd, 0xfd, 0x93, 0xe4, 0x87, 0x7d, 0x27, 0x46, 0xe6, 0x28, 0x17, 0xb1
, 0x16, 0x36, 0x4a, 0x1f, 0xa7, 0xbc, 0x14, 0x8d, 0x95, 0x09, 0x0b, 0xc7, 0x33, 0x3b, 0x36, 0x73
, 0xf8, 0x24, 0x01, 0xcf, 0x7a, 0xa2, 0xe4, 0xcb, 0x1e, 0xcd, 0x90, 0x29, 0x6e, 0x3f, 0x14, 0xcb
, 0x54, 0x13, 0xf8, 0xed, 0x77, 0xbe, 0x73, 0x04, 0x5b, 0x13, 0x91, 0x4c, 0xdc, 0xd6, 0xa9, 0x18
};



#define EXAMPLES_COUNT    16

// примеры для AES получены в "онлайн-калькуляторе" https://www.devglan.com/online-tools/aes-encryption-decryption

const char * g_aes128_key = "0123456789543210";
const char * g_aes256_key = "01234567895432100123456789543210";

const char * g_iv = "9876543210012345";

const char * g_data_to_encrypt[EXAMPLES_COUNT] = {
  "1" 
, "123" 
, "1234567" 
, "012345678901234" 
, "0123456789012345" 
, "01234567890123456" 
, "0123456789012345678901234567890" 
, "01234567890123456789012345678901" 
, "012345678901234567890123456789012" 
, "01234567890123456789012345678901234567890123456" 
, "012345678901234567890123456789012345678901234567" 
, "0123456789012345678901234567890123456789012345678" 
, "012345678901234567890123456789012345678901234567890123456789012" 
, "0123456789012345678901234567890123456789012345678901234567890123" 
, "01234567890123456789012345678901234567890123456789012345678901234" 
, "0123456789012345678901234567890123456789012345678901234567890123012345678901234567890123456789012345678901234567890123456789012301234567890123456789012345678901234567890123456789012345678901230123456789012345678901234567890123456789012345678901234567890123567"
};

const char * g_results_aes128_ecb[EXAMPLES_COUNT] = {
  "73C940E9579021A3053522BFA704E261"
, "D178736B0FFB6FB6474B4DFC447BCE06"
, "1587B1361137DAA1378CD0114F55C803"
, "F51C484C9D5F29EEC6CE52BD747450A6"
, "58739F14FEA5452DF091A83AFC4EE49405EE39B49A1280C74BF3550F9EB59449"
, "58739F14FEA5452DF091A83AFC4EE494087CCA0199C62C2CEA5985F01CE5F9CD"
, "58739F14FEA5452DF091A83AFC4EE49445B8C4F7AE4358D70D6D55F80D8AE015"
, "58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF6450005EE39B49A1280C74BF3550F9EB59449"
, "58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF645009EA38EF570F39FB84BAA40585B92ED47"
, "58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF6450040A985CFD217735012D05D1D47B93452"
, "58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF64500B069FCB80B8964B1BF401A5AFAC937FE05EE39B49A1280C74BF3550F9EB59449"
, "58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF64500B069FCB80B8964B1BF401A5AFAC937FECDEE6BC24C0FFE5325559F965A28A27D"
, "58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF64500B069FCB80B8964B1BF401A5AFAC937FE31A06CC1B3A7A48D3F825645988757F5"
, "58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF64500B069FCB80B8964B1BF401A5AFAC937FE5AC220116FAAE0DD09BBDA2517C8658C05EE39B49A1280C74BF3550F9EB59449"
, "58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF64500B069FCB80B8964B1BF401A5AFAC937FE5AC220116FAAE0DD09BBDA2517C8658CEAAE6C53FA39747F7E6BF457CE78C64E"
, "58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF64500B069FCB80B8964B1BF401A5AFAC937FE5AC220116FAAE0DD09BBDA2517C8658C58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF64500B069FCB80B8964B1BF401A5AFAC937FE5AC220116FAAE0DD09BBDA2517C8658C58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF64500B069FCB80B8964B1BF401A5AFAC937FE5AC220116FAAE0DD09BBDA2517C8658C58739F14FEA5452DF091A83AFC4EE494A12CBE802F65E079E480B15FFDF64500B069FCB80B8964B1BF401A5AFAC937FE5AC220116FAAE0DD09BBDA2517C8658CE97A7203E7FB4E1313C00F6E5F4A08F2"
};


const char * g_results_aes128_cbc[EXAMPLES_COUNT] = {
  "F399CD1ACB1A7230565327C52087243B"
, "3E5A76BE735E4A3D4AA91F4EA017ECDE"
, "9CB3565F6E7952AF24FBB269329D5554"
, "4B073E826F27493C0A44D81AB3CA1C98"
, "7AFC8F5DABBDDF493DE102102CD4361CA2A2BAB4533D8B0210E21403F60E5D89"
, "7AFC8F5DABBDDF493DE102102CD4361C05D2144730A8E2CC71E78362A11F252F"
, "7AFC8F5DABBDDF493DE102102CD4361C77A7FFB9FEAE34832E5B39CC4DAF3EA5"
, "7AFC8F5DABBDDF493DE102102CD4361CE7ACC18CA455A49D971D9FC7644F42B0DFA35E1B8F61039592653D2EBD712DE7"
, "7AFC8F5DABBDDF493DE102102CD4361CE7ACC18CA455A49D971D9FC7644F42B0DAE8F1EFE9C81B8361A89686EA673D86"
, "7AFC8F5DABBDDF493DE102102CD4361CE7ACC18CA455A49D971D9FC7644F42B0F09B70FB7BB37019494A73F1B71B8C4F"
, "7AFC8F5DABBDDF493DE102102CD4361CE7ACC18CA455A49D971D9FC7644F42B0951AF9FE662AC2EA206D7988F49234E8B92183D23290E4986308EDB5CE25F2A7"
, "7AFC8F5DABBDDF493DE102102CD4361CE7ACC18CA455A49D971D9FC7644F42B0951AF9FE662AC2EA206D7988F49234E8E47A8B7AFEAE4D5A1E0B7835F69F6A5A"
, "7AFC8F5DABBDDF493DE102102CD4361CE7ACC18CA455A49D971D9FC7644F42B0951AF9FE662AC2EA206D7988F49234E87B09555C133BE9AE5B9252E4318C345C"
, "7AFC8F5DABBDDF493DE102102CD4361CE7ACC18CA455A49D971D9FC7644F42B0951AF9FE662AC2EA206D7988F49234E80A721E1E5E9620F6FAEB6B96AF2016E145149AF5B16467D4E36B52546DB4C0C2"
, "7AFC8F5DABBDDF493DE102102CD4361CE7ACC18CA455A49D971D9FC7644F42B0951AF9FE662AC2EA206D7988F49234E80A721E1E5E9620F6FAEB6B96AF2016E17DE007C30E68ACD4F7CF59EF2D0835E0"
, "7AFC8F5DABBDDF493DE102102CD4361CE7ACC18CA455A49D971D9FC7644F42B0951AF9FE662AC2EA206D7988F49234E80A721E1E5E9620F6FAEB6B96AF2016E1D8EA44AB96D4F46D6412446A47E17804E8E6BBA25AEF689ED1D2364D965F30895F087D7557D67566AB7551C3C3FF02857A234E516EBB66829FE40C1D48D3DF8445F9A5877879729204D0D73D720EE2D48AC2B08594FD1FABA3CE42C3675524AC2CC6C5F9EC145ECD9CFFD540EC09DD995D540F10EF2694CE84BD32062C538131E1F754DC7873918E2656ECABD9AE11E8F85834141F2BA7758E5061255B30971332B1C82EFC4004B4FA09DB56972202D559F2E9450A3B353967D159156F2E7469FCB01416E71F5315B4AA50176128C46B"
};


const char * g_results_aes128_ctr[EXAMPLES_COUNT] = {
  "99"
, "99F3D5"
, "99F3D5C9405682"
, "98F0D4CE4155836F57277D75590EA2"
, "98F0D4CE4155836F57277D75590EA258"
, "98F0D4CE4155836F57277D75590EA2582E"
, "98F0D4CE4155836F57277D75590EA2582E41F2AC2E042E09D8FA6EA0DA4A2B"
, "98F0D4CE4155836F57277D75590EA2582E41F2AC2E042E09D8FA6EA0DA4A2BCD"
, "98F0D4CE4155836F57277D75590EA2582E41F2AC2E042E09D8FA6EA0DA4A2BCD41"
, "98F0D4CE4155836F57277D75590EA2582E41F2AC2E042E09D8FA6EA0DA4A2BCD41FDFACDA8F1FA42FF345BE249836C"
, "98F0D4CE4155836F57277D75590EA2582E41F2AC2E042E09D8FA6EA0DA4A2BCD41FDFACDA8F1FA42FF345BE249836C5F"
, "98F0D4CE4155836F57277D75590EA2582E41F2AC2E042E09D8FA6EA0DA4A2BCD41FDFACDA8F1FA42FF345BE249836C5FDF"
, "98F0D4CE4155836F57277D75590EA2582E41F2AC2E042E09D8FA6EA0DA4A2BCD41FDFACDA8F1FA42FF345BE249836C5FDF75CB4E0B6BD5E529FD4D6A71747F"
, "98F0D4CE4155836F57277D75590EA2582E41F2AC2E042E09D8FA6EA0DA4A2BCD41FDFACDA8F1FA42FF345BE249836C5FDF75CB4E0B6BD5E529FD4D6A71747FEF"
, "98F0D4CE4155836F57277D75590EA2582E41F2AC2E042E09D8FA6EA0DA4A2BCD41FDFACDA8F1FA42FF345BE249836C5FDF75CB4E0B6BD5E529FD4D6A71747FEF3B"
, "98F0D4CE4155836F57277D75590EA2582E41F2AC2E042E09D8FA6EA0DA4A2BCD41FDFACDA8F1FA42FF345BE249836C5FDF75CB4E0B6BD5E529FD4D6A71747FEF3F17731B12E63B8B4A85105F33AA7F34ADC98A60D2255A13471CBBF59980E947484F2FF80A0EF58DB18841534586A7928FB467CA98E72A9D78F5B8440D51660FDFC5EF05AD00316E79E963728C164D45B6D00031684AFCB9890067E68E97623F8E25B8263572A772619D1E3EA5F13723F3A61E915D5F132065FB594BA2A7D8F42D4B481FD922BC59DFA4574A421DE0B667C4B110F11D1A5B60348D150C9EF9B68FA9699EC92B244CFC449E92E51C468B69B73155CA3649AAFDFC068C78C7374F9B0297"
};



// для Кузнечика и Магмы не нашёл онлайн-инструментов, так что сравниваются результаты программной реализации
// с результатами "железячной"


void logBufferInHex(const unsigned char *src, int len);

//
void process_init_mcu() {
  // включаем тактирование GPIO
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_PAD_CONFIG_M;
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_2_M;
  // PORT2.7 - GPIO
  PAD_CONFIG->PORT_2_CFG = (PAD_CONFIG->PORT_2_CFG & ~(PAD_CONFIG_PIN_M(7)));
  PAD_CONFIG->PORT_2_DS = (PAD_CONFIG->PORT_2_DS & ~(PAD_CONFIG_PIN_M(7)))
                        | PAD_CONFIG_PIN(7, 2)
                        ;
  // PORT2.7 выход (на плате ACE-UNO к этому выводу подключен светодиод)
  GPIO_2->DIRECTION_OUT = (1 << 7);
  GPIO_2->CLEAR = (1 << 7); // светодиод выключен
  // включаем тактирование TIMER32_0 и EPIC
  PM->CLK_APB_M_SET = PM_CLOCK_APB_M_TIMER32_0_M | PM_CLOCK_APB_M_EPIC_M;
  // выбираем истоником тактового сигнала для TIMER32_0 системную частоту
  PM->TIMER_CFG = (PM->TIMER_CFG & ~(PM_TIMER_CFG_MUX_TIMER_M(0)));
  // настройка TIMER32_0
  TIMER32_0->ENABLE = TIMER32_ENABLE_TIM_CLR_M;
  TIMER32_0->TOP = 16999999; // отсчёт 16000000 тактов (2 Гц)
  TIMER32_0->PRESCALER = 0; // /1
  TIMER32_0->CONTROL = 0;
  TIMER32_0->INT_MASK = 0;
  TIMER32_0->INT_CLEAR = 0xFFFFFFFF;
  TIMER32_0->ENABLE = TIMER32_ENABLE_TIM_EN_M;
  // разрешаем прерывания по переполнению
  TIMER32_0->INT_MASK = TIMER32_INT_OVERFLOW_M;
  // разрешаем прерывание от TIMER32_0
  EPIC->MASK_LEVEL_SET = EPIC_LINE_M(EPIC_LINE_TIMER32_0_S);
  // разрешаем прерывания вообще
  set_csr(mstatus, MSTATUS_MIE);
  set_csr(mie, MIE_MEIE);
  // теперь настройка UART_0
  PM->CLK_APB_P_SET = PM_CLOCK_APB_P_GPIO_0_M | PM_CLOCK_APB_P_UART_0_M;
  // PORT0.6 функция последовательного порта
  PAD_CONFIG->PORT_0_CFG = (PAD_CONFIG->PORT_0_CFG & ~(PAD_CONFIG_PIN_M(6)))
                         | PAD_CONFIG_PIN(6, 1)
                         ;
  PAD_CONFIG->PORT_0_PUPD = (PAD_CONFIG->PORT_0_PUPD & ~(PAD_CONFIG_PIN_M(6)));
  // UART_0
  UART_0->CONTROL1 = 0;
  UART_0->CONTROL2 = 0;
  UART_0->CONTROL3 = 0;
  UART_0->DIVIDER = 278; // 32000000/115200
  UART_0->FLAGS = 0xFFFFFFFF;
  UART_0->CONTROL1 = UART_CONTROL1_UE_M | UART_CONTROL1_TE_M;
  // ждём готовности
  while ( 0 == (UART_0->FLAGS & UART_FLAGS_TEACK_M) ) {}
  // CRYPTO
  PM->CLK_AHB_SET = PM_CLOCK_AHB_CRYPTO_M;
}


// обработка прерываний, эта функция вызывается из обработчика прерываний в libbaremetal/src/libc/runtime.c
// располагаем в ОЗУ, чтобы чтение из флэша не вносило задержек
__attribute__ ((section(".ram_text")))
bool process_irqs(void) {
  // TIMER32_0
  if ( 0 != (EPIC->RAW_STATUS & EPIC_LINE_M(EPIC_LINE_TIMER32_0_S)) ) {
    // мигаем светодиодом
    GPIO_2->OUTPUT ^= (1 << 7);
    // сбрасываем флаги прерываний таймера
    TIMER32_0->INT_CLEAR = 0xFFFFFFFF;
    // сбрасываем флаг ожидающего прерывания от TIMER32_0
    EPIC->CLEAR = EPIC_LINE_M(EPIC_LINE_TIMER32_0_S);
    return true;
  } else {
    return false;
  }
}


// ждать флага "готов" не более a_timeout_ms миллисекунд
bool wait_crypto_READY( uint32_t a_timeout_ms ) {
  uint32_t v_from = g_milliseconds;
  do {
    if ( 0 != (CRYPTO->CONFIG & CRYPTO_CONFIG_READY_M) ) {
      return true;
    }
  } while ( (g_milliseconds - v_from) < a_timeout_ms );
  //
  return false;
}


// структура, в которой сохраняется состояние отправки данных в блок CRYPTO
typedef struct {
  // алгоритм
  uint32_t m_algo;
  // режим
  uint32_t m_mode;
  // зашифровать/расшифровать
  uint32_t m_direction;
  // для сборки блока входных данных
  union {
    uint32_t m_u32[4];
    uint8_t m_u8[16];
  } m_block_in;
  // сколько байтов в блоке
  int m_block_in_bytes;
  // а сюда будут последовательно сложены блоки результата
  uint8_t * m_out_ptr;
  // счётчик оставшихся для записи блоков результата
  uint32_t m_out_count;
  // количество записанных блоков
  uint32_t m_written_blocks;
  // сколько слов в одном блоке (4 или 2)
  int m_block_words;
  // сколько байтов было обработано
  uint32_t m_processed_bytes;
} crypto_state_s;


typedef union {
  kuznets_chunk_t m_kch;
  uint32_t m_u32[4];
  uint8_t m_u8[16];
} kuznets_block_t;


typedef struct {
  // режим
  uint32_t m_mode;
  // зашифровать/расшифровать
  uint32_t m_direction;
  // для сборки блока входных данных
  kuznets_block_t m_block_in;
  // сколько байтов в блоке
  int m_block_in_bytes;
  // а сюда будут последовательно сложены блоки результата
  uint8_t * m_out_ptr;
  // счётчик оставшихся для записи блоков результата
  uint32_t m_out_count;
  // количество записанных блоков
  uint32_t m_written_blocks;
  // сколько слов в одном блоке (4 или 2)
  int m_block_words;
  // сколько байтов было обработано
  uint32_t m_processed_bytes;
  // место для хранения "предыдущего" IV для режима дешифрования CBC
  kuznets_block_t m_last_iv;
  // место для хранения блока "гаммы" для текущего обрабатываемого блока в режиме CTR
  kuznets_block_t m_ctr_gamma;
  // раундовые ключи
  kuznets_chunk_t m_kuznets_keys[10];
} kuznets_state_s;


typedef struct {
  // режим
  uint32_t m_mode;
  // зашифровать/расшифровать
  uint32_t m_direction;
  // для сборки блока входных данных
  magma_block_t m_block_in;
  // сколько байтов в блоке
  int m_block_in_bytes;
  // а сюда будут последовательно сложены блоки результата
  uint8_t * m_out_ptr;
  // счётчик оставшихся для записи блоков результата
  uint32_t m_out_count;
  // количество записанных блоков
  uint32_t m_written_blocks;
  // сколько слов в одном блоке (4 или 2)
  int m_block_words;
  // сколько байтов было обработано
  uint32_t m_processed_bytes;
  // место для хранения "предыдущего" IV для режима дешифрования CBC
  magma_block_t m_last_iv;
  // место для хранения блока "гаммы" для текущего обрабатываемого блока в режиме CTR
  magma_block_t m_ctr_gamma;
  // раундовые ключи
  magma_round_key_t m_rkey;
} magma_state_s;


// прибавляем 1 к be128 предсталению iv
void ctr_inc_iv_kuznets( kuznets_state_s * a_state ) {
  for( int i = KUZNECHIK_BLOCK_SIZE - 1; i >= 0; --i ) {
    if ( 0xFF == a_state->m_last_iv.m_u8[i] ) {
      a_state->m_last_iv.m_u8[i] = 0;
    } else {
      ++a_state->m_last_iv.m_u8[i];
      break;
    }
  }
}


// прибавляем 1 к be64 предсталению iv
void ctr_inc_iv_magma( magma_state_s * a_state ) {
  for( int i = MAGMA_BLOCK_SIZE - 1; i >= 0; --i ) {
    if ( 0xFF == a_state->m_last_iv.m_u8[i] ) {
      a_state->m_last_iv.m_u8[i] = 0;
    } else {
      ++a_state->m_last_iv.m_u8[i];
      break;
    }
  }
}


// инициализация шифрования/дешифрования
// a_state - указатель на структуру хранения состояния отправки данных
// a_algo - алгоритм из
//  CRYPTO_CONFIG_CORE_SEL_AES_M
//  CRYPTO_CONFIG_CORE_SEL_MAGMA_M
//  CRYPTO_CONFIG_CORE_SEL_KUZNECHIK_M
// a_mode - режим из
//  CRYPTO_CONFIG_MODE_SEL_ECB_M
//  CRYPTO_CONFIG_MODE_SEL_CBC_M
//  CRYPTO_CONFIG_MODE_SEL_CTR_M
// a_direction
//  CRYPTO_CONFIG_ENCODE_M
//  CRYPTO_CONFIG_DECODE_M
// a_dst - указатель на начало буфера, куда будет записываться результат
// a_out_blocks - максимальное количество блоков в выходном буфере
// a_key - ключ, 16 или 32 байта
// a_iv - "вектор иницииализации", 8 или 16 байтов
static void do_crypto_init( crypto_state_s * a_state
                          , uint32_t a_algo
                          , uint32_t a_mode
                          , uint32_t a_direction
                          , uint8_t * a_dst
                          , uint32_t a_out_blocks
                          , const uint8_t * a_key
                          , const uint8_t * a_iv
                          ) {
  // запоминание и инициализация параметров
  a_state->m_algo = a_algo;
  a_state->m_mode = a_mode;
  a_state->m_direction = a_direction;
  a_state->m_out_ptr = a_dst;
  a_state->m_out_count = a_out_blocks;
  a_state->m_written_blocks = 0;
  a_state->m_block_words = (CRYPTO_CONFIG_CORE_SEL_MAGMA_M == a_algo ? 2 : 4);
  a_state->m_block_in_bytes = 0;
  a_state->m_processed_bytes = 0;
  //
  CRYPTO->CONFIG = a_mode
                 | a_algo
                 | CRYPTO_CONFIG_ENCODE_M
                 | CRYPTO_CONFIG_ORDER_MODE_MSW_M
                 | CRYPTO_CONFIG_C_RESET_M
                 ;
  CRYPTO->CONFIG;
  CRYPTO->CONFIG = a_mode
                 | a_algo
                 | CRYPTO_CONFIG_ENCODE_M
                 | CRYPTO_CONFIG_ORDER_MODE_MSW_M
                 ;
  // размер ключа в словах
  int v_key_words = (CRYPTO_CONFIG_CORE_SEL_AES_M == a_algo) ? 4 : 8;
  // выставляем ключ, 32-битными кусками
  for ( int i = 0; i < v_key_words; ++i ) {
    uint32_t v_word = a_key[3]
                    | (a_key[2] << 8)
                    | (a_key[1] << 16)
                    | (a_key[0] << 24)
                    ;
    CRYPTO->KEY = v_word;
    a_key += 4;
  }
  // ожидаем, когда прочухается
  if ( !wait_crypto_READY( 5u ) ) {
    printf( "Error setup key: [%d] %s\r\n", __LINE__, __FILE__ );
    for (;;) {}
  }
  //
  CRYPTO->CONFIG = (CRYPTO->CONFIG & ~CRYPTO_CONFIG_CODEC_MASK)
                 | a_direction
                 ;
  // загружаем вектор инициализации
  if ( CRYPTO_CONFIG_MODE_SEL_ECB_M != a_mode ) {
    for ( int i = 0; i < a_state->m_block_words; ++i ) {
      uint32_t v_word = a_iv[3]
                      | (a_iv[2] << 8)
                      | (a_iv[1] << 16)
                      | (a_iv[0] << 24)
                      ;
      CRYPTO->INIT = v_word;
      a_iv += 4;
    }
    // ожидаем, когда прочухается
    if ( !wait_crypto_READY( 5u ) ) {
      printf( "Error setup iv: [%d] %s\r\n", __LINE__, __FILE__ );
      for (;;) {}
    }
  }
}


static void do_sw_kuznets_init( kuznets_state_s * a_state
                          , uint32_t a_mode
                          , uint32_t a_direction
                          , uint8_t * a_dst
                          , uint32_t a_out_blocks
                          , const uint8_t * a_key
                          , const uint8_t * a_iv
                          ) {
  // запоминание и инициализация параметров
  a_state->m_mode = a_mode;
  a_state->m_direction = a_direction;
  a_state->m_out_ptr = a_dst;
  a_state->m_out_count = a_out_blocks;
  a_state->m_written_blocks = 0;
  a_state->m_block_words = 4;
  a_state->m_block_in_bytes = 0;
  a_state->m_processed_bytes = 0;
  // развернём ключи
  kuznets_gen_round_keys( a_key, a_state->m_kuznets_keys );
  // запомним вектор инициализации
  memcpy( a_state->m_last_iv.m_u8, a_iv, KUZNECHIK_BLOCK_SIZE );
  // если это режим CTR
  if ( CRYPTO_CONFIG_MODE_SEL_CTR_M == a_mode ) {
    // формируем начальный блок "гаммы"
    kuznets_encrypt( a_state->m_kuznets_keys, a_state->m_last_iv.m_kch, a_state->m_ctr_gamma.m_kch );
    // следующее значение для iv
    ctr_inc_iv_kuznets( a_state );
  }
}


static void do_sw_magma_init( magma_state_s * a_state
                            , uint32_t a_mode
                            , uint32_t a_direction
                            , uint8_t * a_dst
                            , uint32_t a_out_blocks
                            , const uint8_t * a_key
                            , const uint8_t * a_iv
                            ) {
  // запоминание и инициализация параметров
  a_state->m_mode = a_mode;
  a_state->m_direction = a_direction;
  a_state->m_out_ptr = a_dst;
  a_state->m_out_count = a_out_blocks;
  a_state->m_written_blocks = 0;
  a_state->m_block_words = 2;
  a_state->m_block_in_bytes = 0;
  a_state->m_processed_bytes = 0;
  // развернём ключи
  magma_key_t v_key;
  memcpy( v_key.m_u8, a_key, sizeof(v_key.m_u8) );
  magma_make_round_keys( &v_key, &a_state->m_rkey );
  // запомним вектор инициализации
  memcpy( a_state->m_last_iv.m_u8, a_iv, sizeof(a_state->m_last_iv.m_u8) );
  // если это режим CTR
  if ( CRYPTO_CONFIG_MODE_SEL_CTR_M == a_mode ) {
    // формируем начальный блок "гаммы"
    magma_block_rounds( &a_state->m_rkey, &a_state->m_last_iv, &a_state->m_ctr_gamma, true );
    // следующее значение для iv
    ctr_inc_iv_magma( a_state );
  }
}


// докинуть данных
// a_state - указатель на структуру хранения состояния отправки данных
// a_src - указатель на начало байтового буфера, a_len - его размер в байтах
// на выходе true, если прошло без ошибок
static bool do_crypto_update( crypto_state_s * a_state, const uint8_t * a_src, uint32_t a_len ) {
  // обновляем счётчик обработанных байтов
  a_state->m_processed_bytes += a_len;
  // пока не всё обработано
  while ( 0 != a_len ) {
    // добиваем блок
    while ( a_state->m_block_in_bytes < (a_state->m_block_words * 4) && 0 != a_len ) {
      a_state->m_block_in.m_u8[a_state->m_block_in_bytes++] = *a_src++;
      --a_len;
    }
    // если блок полностью сформирован, обрабатываем его
    if ( a_state->m_block_in_bytes == (a_state->m_block_words * 4) ) {
      // закидываем слова блока в TEXT_IN
      for ( int i = 0; i < a_state->m_block_words; ++i ) {
        CRYPTO->BLOCK = htobe32( a_state->m_block_in.m_u32[i] );
      }
      //
      if ( !wait_crypto_READY( 2u ) ) {
        return false;
      }
      // записываем результат
      for ( int i = 0; i < a_state->m_block_words && 0 != a_state->m_out_count; ++i ) {
        // слово выходного блока
        uint32_t v_out_word = CRYPTO->BLOCK;
        // пишем результат на своё место
        a_state->m_out_ptr[0] = (uint8_t)(v_out_word >> 24);
        a_state->m_out_ptr[1] = (uint8_t)(v_out_word >> 16);
        a_state->m_out_ptr[2] = (uint8_t)(v_out_word >> 8);
        a_state->m_out_ptr[3] = (uint8_t)v_out_word;
        // двигаем указатель результата
        a_state->m_out_ptr += 4;
      }
      // уменьшаем количество доступных для сохранения слов
      --a_state->m_out_count;
      // увеличиваем количество записанных блоков
      ++a_state->m_written_blocks;
      // обнуляем счётчик заполнения блока входных данных
      a_state->m_block_in_bytes= 0;
    }
  }
  //
  return true;
}


static bool do_sw_kuznets_update( kuznets_state_s * a_state, const uint8_t * a_src, uint32_t a_len ) {
  // обновляем счётчик обработанных байтов
  a_state->m_processed_bytes += a_len;
  // пока не всё обработано
  while ( 0 != a_len ) {
    // добиваем блок
    while ( a_state->m_block_in_bytes < (a_state->m_block_words * 4) && 0 != a_len ) {
      a_state->m_block_in.m_u8[a_state->m_block_in_bytes++] = *a_src++;
      --a_len;
    }
    // если блок полностью сформирован, обрабатываем его
    if ( a_state->m_block_in_bytes == (a_state->m_block_words * 4) ) {
      kuznets_block_t v_out;
      //
      switch ( a_state->m_mode ) {
        case CRYPTO_CONFIG_MODE_SEL_CBC_M:
          if ( CRYPTO_CONFIG_ENCODE_M == a_state->m_direction ) {
            for ( int i = 0; i < KUZNECHIK_BLOCK_SIZE; ++i ) {
              a_state->m_block_in.m_u8[i] ^= a_state->m_last_iv.m_u8[i];
            }
            kuznets_encrypt( a_state->m_kuznets_keys, a_state->m_block_in.m_kch, v_out.m_kch );
            memcpy( a_state->m_last_iv.m_u8, v_out.m_u8, KUZNECHIK_BLOCK_SIZE );
          } else {
            kuznets_decrypt( a_state->m_kuznets_keys, a_state->m_block_in.m_kch, v_out.m_kch );
            for ( int i = 0; i < KUZNECHIK_BLOCK_SIZE; ++i ) {
              v_out.m_u8[i] ^= a_state->m_last_iv.m_u8[i];
            }
            memcpy( a_state->m_last_iv.m_u8, a_state->m_block_in.m_u8, KUZNECHIK_BLOCK_SIZE );
          }
          break;
          
        case CRYPTO_CONFIG_MODE_SEL_CTR_M:
          // шифруем блок
          for ( int i = 0; i < KUZNECHIK_BLOCK_SIZE; ++i ) {
            v_out.m_u8[i] = a_state->m_block_in.m_u8[i] ^ a_state->m_ctr_gamma.m_u8[i];
          }
          // следующий блок "гаммы"
          kuznets_encrypt( a_state->m_kuznets_keys, a_state->m_last_iv.m_kch, a_state->m_ctr_gamma.m_kch );
          // следующее значение для iv
          ctr_inc_iv_kuznets( a_state );
          break;
        
        //case CRYPTO_CONTROL_MODE_ECB:
        default:
          if ( CRYPTO_CONFIG_ENCODE_M == a_state->m_direction ) {
            kuznets_encrypt( a_state->m_kuznets_keys, a_state->m_block_in.m_kch, v_out.m_kch );
          } else {
            kuznets_decrypt( a_state->m_kuznets_keys, a_state->m_block_in.m_kch, v_out.m_kch );
          }
          break;
      }
      // записываем результат
      for ( int i = 0; i < a_state->m_block_words && 0 != a_state->m_out_count; ++i ) {
        // слово выходного блока
        uint32_t v_out_word = v_out.m_u32[i];
        // пишем результат на своё место
        a_state->m_out_ptr[0] = (uint8_t)v_out_word;
        a_state->m_out_ptr[1] = (uint8_t)(v_out_word >> 8);
        a_state->m_out_ptr[2] = (uint8_t)(v_out_word >> 16);
        a_state->m_out_ptr[3] = (uint8_t)(v_out_word >> 24);
        // двигаем указатель результата
        a_state->m_out_ptr += 4;
      }
      // уменьшаем количество доступных для сохранения слов
      --a_state->m_out_count;
      // увеличиваем количество записанных блоков
      ++a_state->m_written_blocks;
      // обнуляем счётчик заполнения блока входных данных
      a_state->m_block_in_bytes= 0;
    }
  }
  //
  return true;
}


static bool do_sw_magma_update( magma_state_s * a_state, const uint8_t * a_src, uint32_t a_len ) {
  // обновляем счётчик обработанных байтов
  a_state->m_processed_bytes += a_len;
  // пока не всё обработано
  while ( 0 != a_len ) {
    // добиваем блок
    while ( a_state->m_block_in_bytes < (a_state->m_block_words * 4) && 0 != a_len ) {
      a_state->m_block_in.m_u8[a_state->m_block_in_bytes++] = *a_src++;
      --a_len;
    }
    // если блок полностью сформирован, обрабатываем его
    if ( a_state->m_block_in_bytes == (a_state->m_block_words * 4) ) {
      magma_block_t v_out;
      //
      switch ( a_state->m_mode ) {
        case CRYPTO_CONFIG_MODE_SEL_CBC_M:
          if ( CRYPTO_CONFIG_ENCODE_M == a_state->m_direction ) {
            for ( int i = 0; i < MAGMA_BLOCK_SIZE; ++i ) {
              a_state->m_block_in.m_u8[i] ^= a_state->m_last_iv.m_u8[i];
            }
            magma_block_rounds( &a_state->m_rkey, &a_state->m_block_in, &v_out, true );
            memcpy( a_state->m_last_iv.m_u8, v_out.m_u8, MAGMA_BLOCK_SIZE );
          } else {
            magma_block_rounds( &a_state->m_rkey, &a_state->m_block_in, &v_out, false );
            for ( int i = 0; i < MAGMA_BLOCK_SIZE; ++i ) {
              v_out.m_u8[i] ^= a_state->m_last_iv.m_u8[i];
            }
            memcpy( a_state->m_last_iv.m_u8, a_state->m_block_in.m_u8, MAGMA_BLOCK_SIZE );
          }
          break;
          
        case CRYPTO_CONFIG_MODE_SEL_CTR_M:
          // шифруем блок
          for ( int i = 0; i < MAGMA_BLOCK_SIZE; ++i ) {
            v_out.m_u8[i] = a_state->m_block_in.m_u8[i] ^ a_state->m_ctr_gamma.m_u8[i];
          }
          // следующий блок "гаммы"
          magma_block_rounds( &a_state->m_rkey, &a_state->m_last_iv, &a_state->m_ctr_gamma, true );
          // следующее значение для iv
          ctr_inc_iv_magma( a_state );
          break;
        
        //case CRYPTO_CONTROL_MODE_ECB:
        default:
          magma_block_rounds(
                &a_state->m_rkey
              , &a_state->m_block_in
              , &v_out
              , CRYPTO_CONFIG_ENCODE_M == a_state->m_direction
              );
          break;
      }
      // записываем результат
      for ( int i = 0; i < a_state->m_block_words && 0 != a_state->m_out_count; ++i ) {
        // слово выходного блока
        uint32_t v_out_word = v_out.m_u32[i];
        // пишем результат на своё место
        a_state->m_out_ptr[0] = (uint8_t)v_out_word;
        a_state->m_out_ptr[1] = (uint8_t)(v_out_word >> 8);
        a_state->m_out_ptr[2] = (uint8_t)(v_out_word >> 16);
        a_state->m_out_ptr[3] = (uint8_t)(v_out_word >> 24);
        // двигаем указатель результата
        a_state->m_out_ptr += 4;
      }
      // уменьшаем количество доступных для сохранения слов
      --a_state->m_out_count;
      // увеличиваем количество записанных блоков
      ++a_state->m_written_blocks;
      // обнуляем счётчик заполнения блока входных данных
      a_state->m_block_in_bytes= 0;
    }
  }
  //
  return true;
}


// завершить
// a_state - указатель на структуру хранения состояния отправки данных
// на выходе количество байтов, записанное в буфер результата либо 0 (ноль), если произошла ошибка
static uint32_t do_crypto_final( crypto_state_s * a_state ) {
  if ( CRYPTO_CONFIG_ENCODE_M == a_state->m_direction ) {
    // проверим, есть ли данные в буфере
    while ( a_state->m_block_in_bytes >= 0 ) {
      if ( CRYPTO_CONFIG_MODE_SEL_CTR_M != a_state->m_mode ) {
        // PKCS#7 padding
        // если размер входных данных кратен размеру блока, то будет добавлен ещё одни блок,
        // заполненный байтовым значением размера блока
        // иначе блок будет дополнен до своего размера байтовым значением недостающего в блоке
        // количества байтов
        int v_pad = (a_state->m_block_words * 4) - a_state->m_block_in_bytes;
        memset( &a_state->m_block_in.m_u8[a_state->m_block_in_bytes], v_pad, v_pad );
      }
      // обрабатываем блок
      for ( int i = 0; i < a_state->m_block_words; ++i ) {
        CRYPTO->BLOCK = htobe32( a_state->m_block_in.m_u32[i] );
      }
      //
      if ( !wait_crypto_READY( 2u ) ) {
        return 0;
      }
      // записываем результат
      for ( int i = 0; i < a_state->m_block_words && 0 != a_state->m_out_count; ++i ) {
        uint32_t v_out_word = be32toh(CRYPTO->BLOCK);
        //
        a_state->m_out_ptr[0] = (uint8_t)v_out_word;
        a_state->m_out_ptr[1] = (uint8_t)(v_out_word >> 8);
        a_state->m_out_ptr[2] = (uint8_t)(v_out_word >> 16);
        a_state->m_out_ptr[3] = (uint8_t)(v_out_word >> 24);
        //
        a_state->m_out_ptr += 4;
      }
      //
      --a_state->m_out_count;
      ++a_state->m_written_blocks;
      a_state->m_block_in_bytes -= (a_state->m_block_words * 4);
    }
  } else {
    if ( a_state->m_block_in_bytes > 0 ) {
      if ( CRYPTO_CONFIG_MODE_SEL_CTR_M != a_state->m_mode ) {
        // PKCS#7 padding
        int v_pad = (a_state->m_block_words * 4) - a_state->m_block_in_bytes;
        memset( &a_state->m_block_in.m_u8[a_state->m_block_in_bytes], v_pad, v_pad );
      }
      // обрабатываем блок
      for ( int i = 0; i < a_state->m_block_words; ++i ) {
        CRYPTO->BLOCK = htobe32( a_state->m_block_in.m_u32[i] );
      }
      //
      if ( !wait_crypto_READY( 2u ) ) {
        return 0;
      }
      // записываем результат
      for ( int i = 0; i < a_state->m_block_words && 0 != a_state->m_out_count; ++i ) {
        uint32_t v_out_word = be32toh(CRYPTO->BLOCK);
        a_state->m_out_ptr[0] = (uint8_t)v_out_word;
        a_state->m_out_ptr[1] = (uint8_t)(v_out_word >> 8);
        a_state->m_out_ptr[2] = (uint8_t)(v_out_word >> 16);
        a_state->m_out_ptr[3] = (uint8_t)(v_out_word >> 24);
        //
        a_state->m_out_ptr += 4;
      }
      //
      --a_state->m_out_count;
      ++a_state->m_written_blocks;
      a_state->m_block_in_bytes = 0;
    }
  }
  // возвращаем количество байтов результата
  return (CRYPTO_CONFIG_MODE_SEL_CTR_M != a_state->m_mode)
       ? a_state->m_written_blocks * a_state->m_block_words * 4
       : a_state->m_processed_bytes
       ;
}


static uint32_t do_sw_kuznets_final( kuznets_state_s * a_state ) {
  kuznets_block_t v_out;
  if ( CRYPTO_CONFIG_ENCODE_M == a_state->m_direction ) {
    // проверим, есть ли данные в буфере
    while ( a_state->m_block_in_bytes >= 0 ) {
      if ( CRYPTO_CONFIG_MODE_SEL_CTR_M != a_state->m_mode ) {
        // PKCS#7 padding
        // если размер входных данных кратен размеру блока, то будет добавлен ещё одни блок,
        // заполненный байтовым значением размера блока
        // иначе блок будет дополнен до своего размера байтовым значением недостающего в блоке
        // количества байтов
        int v_pad = (a_state->m_block_words * 4) - a_state->m_block_in_bytes;
        memset( &a_state->m_block_in.m_u8[a_state->m_block_in_bytes], v_pad, v_pad );
      }
      //
      switch ( a_state->m_mode ) {
        case CRYPTO_CONFIG_MODE_SEL_CBC_M:
          for ( int i = 0; i < KUZNECHIK_BLOCK_SIZE; ++i ) {
            a_state->m_block_in.m_u8[i] ^= a_state->m_last_iv.m_u8[i];
          }
          kuznets_encrypt( a_state->m_kuznets_keys, a_state->m_block_in.m_kch, v_out.m_kch );
          memcpy( a_state->m_last_iv.m_u8, v_out.m_u8, KUZNECHIK_BLOCK_SIZE );
          break;
        
        case CRYPTO_CONFIG_MODE_SEL_CTR_M:
          // шифруем блок
          for ( int i = 0; i < KUZNECHIK_BLOCK_SIZE; ++i ) {
            v_out.m_u8[i] = a_state->m_block_in.m_u8[i] ^ a_state->m_ctr_gamma.m_u8[i];
          }
          break;

        //case CRYPTO_CONTROL_MODE_ECB:
        default:
          kuznets_encrypt( a_state->m_kuznets_keys, a_state->m_block_in.m_kch, v_out.m_kch );
          break;
      }
      // записываем результат
      for ( int i = 0; i < a_state->m_block_words && 0 != a_state->m_out_count; ++i ) {
        // слово выходного блока
        uint32_t v_out_word = v_out.m_u32[i];
        // пишем результат на своё место
        a_state->m_out_ptr[0] = (uint8_t)v_out_word;
        a_state->m_out_ptr[1] = (uint8_t)(v_out_word >> 8);
        a_state->m_out_ptr[2] = (uint8_t)(v_out_word >> 16);
        a_state->m_out_ptr[3] = (uint8_t)(v_out_word >> 24);
        // двигаем указатель результата
        a_state->m_out_ptr += 4;
      }
      //
      --a_state->m_out_count;
      ++a_state->m_written_blocks;
      a_state->m_block_in_bytes -= (a_state->m_block_words * 4);
    }
  } else {
    if ( a_state->m_block_in_bytes > 0 ) {
      if ( CRYPTO_CONFIG_MODE_SEL_CTR_M != a_state->m_mode ) {
        // PKCS#7 padding
        int v_pad = (a_state->m_block_words * 4) - a_state->m_block_in_bytes;
        memset( &a_state->m_block_in.m_u8[a_state->m_block_in_bytes], v_pad, v_pad );
      }
      //
      switch ( a_state->m_mode ) {
        case CRYPTO_CONFIG_MODE_SEL_CBC_M:
          kuznets_decrypt( a_state->m_kuznets_keys, a_state->m_block_in.m_kch, v_out.m_kch );
          for ( int i = 0; i < KUZNECHIK_BLOCK_SIZE; ++i ) {
            v_out.m_u8[i] ^= a_state->m_last_iv.m_u8[i];
          }
          memcpy( a_state->m_last_iv.m_u8, a_state->m_block_in.m_u8, KUZNECHIK_BLOCK_SIZE );
          break;
        
        case CRYPTO_CONFIG_MODE_SEL_CTR_M:
          // шифруем блок
          for ( int i = 0; i < KUZNECHIK_BLOCK_SIZE; ++i ) {
            v_out.m_u8[i] = a_state->m_block_in.m_u8[i] ^ a_state->m_ctr_gamma.m_u8[i];
          }
          break;
          
        //case CRYPTO_CONTROL_MODE_ECB:
        default:
          kuznets_decrypt( a_state->m_kuznets_keys, a_state->m_block_in.m_kch, v_out.m_kch );
          break;
      }
      // записываем результат
      for ( int i = 0; i < a_state->m_block_words && 0 != a_state->m_out_count; ++i ) {
        // слово выходного блока
        uint32_t v_out_word = v_out.m_u32[i];
        // пишем результат на своё место
        a_state->m_out_ptr[0] = (uint8_t)v_out_word;
        a_state->m_out_ptr[1] = (uint8_t)(v_out_word >> 8);
        a_state->m_out_ptr[2] = (uint8_t)(v_out_word >> 16);
        a_state->m_out_ptr[3] = (uint8_t)(v_out_word >> 24);
        // двигаем указатель результата
        a_state->m_out_ptr += 4;
      }
      //
      --a_state->m_out_count;
      ++a_state->m_written_blocks;
      a_state->m_block_in_bytes = 0;
    }
  }
  // возвращаем количество байтов результата
  return (CRYPTO_CONFIG_MODE_SEL_CTR_M != a_state->m_mode)
       ? a_state->m_written_blocks * a_state->m_block_words * 4
       : a_state->m_processed_bytes
       ;
}


static uint32_t do_sw_magma_final( magma_state_s * a_state ) {
  magma_block_t v_out;
  if ( CRYPTO_CONFIG_ENCODE_M == a_state->m_direction ) {
    // проверим, есть ли данные в буфере
    while ( a_state->m_block_in_bytes >= 0 ) {
      if ( CRYPTO_CONFIG_MODE_SEL_CTR_M != a_state->m_mode ) {
        // PKCS#7 padding
        // если размер входных данных кратен размеру блока, то будет добавлен ещё одни блок,
        // заполненный байтовым значением размера блока
        // иначе блок будет дополнен до своего размера байтовым значением недостающего в блоке
        // количества байтов
        int v_pad = (a_state->m_block_words * 4) - a_state->m_block_in_bytes;
        memset( &a_state->m_block_in.m_u8[a_state->m_block_in_bytes], v_pad, v_pad );
      }
      //
      switch ( a_state->m_mode ) {
        case CRYPTO_CONFIG_MODE_SEL_CBC_M:
          for ( int i = 0; i < MAGMA_BLOCK_SIZE; ++i ) {
            a_state->m_block_in.m_u8[i] ^= a_state->m_last_iv.m_u8[i];
          }
          magma_block_rounds( &a_state->m_rkey, &a_state->m_block_in, &v_out, true );
          memcpy( a_state->m_last_iv.m_u8, v_out.m_u8, MAGMA_BLOCK_SIZE );
          break;
        
        case CRYPTO_CONFIG_MODE_SEL_CTR_M:
          // шифруем блок
          for ( int i = 0; i < MAGMA_BLOCK_SIZE; ++i ) {
            v_out.m_u8[i] = a_state->m_block_in.m_u8[i] ^ a_state->m_ctr_gamma.m_u8[i];
          }
          break;

        //case CRYPTO_CONTROL_MODE_ECB:
        default:
          magma_block_rounds( &a_state->m_rkey, &a_state->m_block_in, &v_out, true );
          break;
      }
      // записываем результат
      for ( int i = 0; i < a_state->m_block_words && 0 != a_state->m_out_count; ++i ) {
        // слово выходного блока
        uint32_t v_out_word = v_out.m_u32[i];
        // пишем результат на своё место
        a_state->m_out_ptr[0] = (uint8_t)v_out_word;
        a_state->m_out_ptr[1] = (uint8_t)(v_out_word >> 8);
        a_state->m_out_ptr[2] = (uint8_t)(v_out_word >> 16);
        a_state->m_out_ptr[3] = (uint8_t)(v_out_word >> 24);
        // двигаем указатель результата
        a_state->m_out_ptr += 4;
      }
      //
      --a_state->m_out_count;
      ++a_state->m_written_blocks;
      a_state->m_block_in_bytes -= (a_state->m_block_words * 4);
    }
  } else {
    // дешифрование
    if ( a_state->m_block_in_bytes > 0 ) {
      if ( CRYPTO_CONFIG_MODE_SEL_CTR_M != a_state->m_mode ) {
        // PKCS#7 padding
        int v_pad = (a_state->m_block_words * 4) - a_state->m_block_in_bytes;
        memset( &a_state->m_block_in.m_u8[a_state->m_block_in_bytes], v_pad, v_pad );
      }
      //
      switch ( a_state->m_mode ) {
        case CRYPTO_CONFIG_MODE_SEL_CBC_M:
          magma_block_rounds( &a_state->m_rkey, &a_state->m_block_in, &v_out, false );
          for ( int i = 0; i < MAGMA_BLOCK_SIZE; ++i ) {
            v_out.m_u8[i] ^= a_state->m_last_iv.m_u8[i];
          }
          memcpy( a_state->m_last_iv.m_u8, a_state->m_block_in.m_u8, MAGMA_BLOCK_SIZE );
          break;
        
        case CRYPTO_CONFIG_MODE_SEL_CTR_M:
          // шифруем блок
          for ( int i = 0; i < MAGMA_BLOCK_SIZE; ++i ) {
            v_out.m_u8[i] = a_state->m_block_in.m_u8[i] ^ a_state->m_ctr_gamma.m_u8[i];
          }
          break;
          
        //case CRYPTO_CONTROL_MODE_ECB:
        default:
          magma_block_rounds( &a_state->m_rkey, &a_state->m_block_in, &v_out, false );
          break;
      }
      // записываем результат
      for ( int i = 0; i < a_state->m_block_words && 0 != a_state->m_out_count; ++i ) {
        // слово выходного блока
        uint32_t v_out_word = v_out.m_u32[i];
        // пишем результат на своё место
        a_state->m_out_ptr[0] = (uint8_t)v_out_word;
        a_state->m_out_ptr[1] = (uint8_t)(v_out_word >> 8);
        a_state->m_out_ptr[2] = (uint8_t)(v_out_word >> 16);
        a_state->m_out_ptr[3] = (uint8_t)(v_out_word >> 24);
        // двигаем указатель результата
        a_state->m_out_ptr += 4;
      }
      //
      --a_state->m_out_count;
      ++a_state->m_written_blocks;
      a_state->m_block_in_bytes = 0;
    }
  }
  // возвращаем количество байтов результата
  return (CRYPTO_CONFIG_MODE_SEL_CTR_M != a_state->m_mode)
       ? a_state->m_written_blocks * a_state->m_block_words * 4
       : a_state->m_processed_bytes
       ;
}


// преобразовать байтовый буфер в hex-строку
void bytes_to_hex( char * a_dst, uint8_t * a_src, uint32_t a_count ) {
  while ( 0 != a_count-- ) {
    uint8_t v_byte = *a_src++;
    uint8_t v_nibble = (v_byte >> 4);
    *a_dst++ = (v_nibble < 0x0Au) ? v_nibble + '0' : v_nibble + ('A' - 0x0A);
    v_nibble = v_byte & 0x0F;
    *a_dst++ = (v_nibble < 0x0Au) ? v_nibble + '0' : v_nibble + ('A' - 0x0A);
  }
  // завершающий ноль
  *a_dst = 0;
}


char g_str[2048];
char g_str_kuznets[2048];
uint8_t g_encrypted[1024];
uint8_t g_decrypted[1024];


bool check_encrypt_results( uint32_t a_result_bytes, const char * a_master_result ) {
  if ( 0 == a_result_bytes ) {
    // что-то не сработало
    printf( "FAILED\n" );
    return false;
  } else {
    // преобразовываем последовательность байтов результата в hex-строку
    // почему так - потому, что так наглядней :)
    bytes_to_hex( g_str, g_encrypted, a_result_bytes );
    // сравниваем образцовый результат и посчитанный
    if ( 0 == strcmp( g_str, a_master_result ) ) {
      // всё сходится
      printf( "OK\n" );
      return true;
    } else {
      // несходняк
      printf( "ERROR\n"
              "  Result:   '%s'\n"
              "  Expected: '%s'\n"
              , g_str
              , a_master_result
            );
      return false;
    }
  }
}


// проверка дешифрования
// a_text - открытый текст (строка в HEX виде)
// g_encrypted - закрытый текст (байты), результат шифрования с контекстом a_encrypt_state
void check_decrypt( crypto_state_s * a_encrypt_state, const char * a_text, const char * a_key, const char * a_iv ) {
  crypto_state_s v_st;
  printf( "  decrypt: " );
  do_crypto_init( &v_st
                , a_encrypt_state->m_algo
                , a_encrypt_state->m_mode
                , CRYPTO_CONFIG_DECODE_M
                , g_decrypted
                , sizeof(g_decrypted)/sizeof(uint32_t)
                , (const uint8_t *)a_key
                , (const uint8_t *)a_iv
                );
  //
  uint32_t v_bytes_to_decrypt = (CRYPTO_CONFIG_MODE_SEL_CTR_M == a_encrypt_state->m_mode)
                              ? a_encrypt_state->m_processed_bytes
                              : a_encrypt_state->m_written_blocks * a_encrypt_state->m_block_words * 4
                              ;
  if ( !do_crypto_update( &v_st, g_encrypted, v_bytes_to_decrypt ) ) {
    printf( "FAILED\n" );
  } else {
    uint32_t v_result_bytes = do_crypto_final( &v_st );
    if ( 0 == v_result_bytes ) {
      printf( "FAILED\n" );
    } else {
      //
      if ( 0 == memcmp( a_text, g_decrypted, strlen(a_text) ) ) {
        printf( "OK\n" );
      } else {
        printf( "ERROR, v_result_bytes = %u\n original:\n", v_result_bytes );
        logBufferInHex( (const uint8_t *)a_text, strlen( a_text ) );
        printf( "encrypted:\n" );
        logBufferInHex( g_encrypted, v_result_bytes );
        printf( "decrypted:\n" );
        logBufferInHex( g_decrypted, v_result_bytes );
      }
    }
  }
}


// проверка шифрования/дешифрования по алгоритму Кузнечик
// i - порядковый номер теста
// a_mode - режим шифрования/дешифрования
// a_mode_name - строчное название режима a_mode
void test_kuznets( int i, uint32_t a_mode, const char * a_mode_name ) {
  crypto_state_s v_st;
  
  printf( "Kuznets %s [%d]...", a_mode_name, i );
  // сначала приготовим образец
  kuznets_state_s v_kst;
  bzero( g_str, sizeof(g_str) );
  bzero( g_encrypted, sizeof(g_encrypted) );
  //
  do_sw_kuznets_init( &v_kst
                  , a_mode
                  , CRYPTO_CONFIG_ENCODE_M
                  , g_encrypted
                  , sizeof(g_encrypted)/sizeof(uint32_t)
                  , (const uint8_t *)g_aes256_key
                  , (const uint8_t *)g_iv
                  );
  do_sw_kuznets_update( &v_kst, (const uint8_t *)g_data_to_encrypt[i], strlen(g_data_to_encrypt[i]) );
  uint32_t v_crypto_bytes = do_sw_kuznets_final( &v_kst );
  bytes_to_hex( g_str_kuznets, g_encrypted, v_crypto_bytes );
  // чистим буферы
  bzero( g_str, sizeof(g_str) );
  bzero( g_encrypted, sizeof(g_encrypted) );
  // считаем очередной пример
  do_crypto_init( &v_st
                , CRYPTO_CONFIG_CORE_SEL_KUZNECHIK_M
                , a_mode
                , CRYPTO_CONFIG_ENCODE_M
                , g_encrypted
                , sizeof(g_encrypted)/sizeof(uint32_t)
                , (const uint8_t *)g_aes256_key
                , (const uint8_t *)g_iv
                );
  // проверим итог do_crypto_update()
  if ( !do_crypto_update( &v_st, (const uint8_t *)g_data_to_encrypt[i], strlen(g_data_to_encrypt[i]) ) ) {
    // что-то не сработало
    printf( "FAILED\n" );
  } else {
    uint32_t v_result_bytes = do_crypto_final( &v_st );
    // проверяем 
    if ( check_encrypt_results( v_result_bytes, g_str_kuznets ) ) {
      // пробуем расшифровать
      check_decrypt( &v_st, g_data_to_encrypt[i], g_aes256_key, g_iv );
    }
  }
}


// проверка шифрования/дешифрования по алгоритму Магма
// i - порядковый номер теста
// a_mode - режим шифрования/дешифрования
// a_mode_name - строчное название режима a_mode
void test_magma( int i, uint32_t a_mode, const char * a_mode_name ) {
  crypto_state_s v_st;
  
  printf( "Magma   %s [%d]...", a_mode_name, i );
  // сначала приготовим образец
  magma_state_s v_mst;
  bzero( g_str, sizeof(g_str) );
  bzero( g_encrypted, sizeof(g_encrypted) );
  //
  do_sw_magma_init( &v_mst
                  , a_mode
                  , CRYPTO_CONFIG_ENCODE_M
                  , g_encrypted
                  , sizeof(g_encrypted)/sizeof(uint32_t)
                  , (const uint8_t *)g_aes256_key
                  , (const uint8_t *)g_iv
                  );
  do_sw_magma_update( &v_mst, (const uint8_t *)g_data_to_encrypt[i], strlen(g_data_to_encrypt[i]) );
  uint32_t v_crypto_bytes = do_sw_magma_final( &v_mst );
  bytes_to_hex( g_str_kuznets, g_encrypted, v_crypto_bytes );
  // чистим буферы
  bzero( g_str, sizeof(g_str) );
  bzero( g_encrypted, sizeof(g_encrypted) );
  // считаем очередной пример
  do_crypto_init( &v_st
                , CRYPTO_CONFIG_CORE_SEL_MAGMA_M
                , a_mode
                , CRYPTO_CONFIG_ENCODE_M
                , g_encrypted
                , sizeof(g_encrypted)/sizeof(uint32_t)
                , (const uint8_t *)g_aes256_key
                , (const uint8_t *)g_iv
                );
  // проверим итог do_crypto_update()
  if ( !do_crypto_update( &v_st, (const uint8_t *)g_data_to_encrypt[i], strlen(g_data_to_encrypt[i]) ) ) {
    // что-то не сработало
    printf( "FAILED\n" );
  } else {
    uint32_t v_result_bytes = do_crypto_final( &v_st );
    // проверяем 
    if ( check_encrypt_results( v_result_bytes, g_str_kuznets ) ) {
      // пробуем расшифровать
      check_decrypt( &v_st, g_data_to_encrypt[i], g_aes256_key, g_iv );
    }
  }
}


// точка входа
void main() {
  crypto_state_s v_st;
  // проверяем примеры по порядку
  for ( int i = 0; i < EXAMPLES_COUNT; ++i ) {
    printf( "---- %d ----\n", i );
    // AES-128 ECB
    printf( "AES-128 ECB [%d]...", i );
    // чистим буферы
    bzero( g_str, sizeof(g_str) );
    bzero( g_encrypted, sizeof(g_encrypted) );
    // считаем очередной пример
    do_crypto_init( &v_st
                  , CRYPTO_CONFIG_CORE_SEL_AES_M
                  , CRYPTO_CONFIG_MODE_SEL_ECB_M
                  , CRYPTO_CONFIG_ENCODE_M
                  , g_encrypted
                  , sizeof(g_encrypted)/sizeof(uint32_t)
                  , (const uint8_t *)g_aes128_key
                  , (const uint8_t *)g_iv
                  );
    // проверим итог do_crypto_update()
    if ( !do_crypto_update( &v_st, (const uint8_t *)g_data_to_encrypt[i], strlen(g_data_to_encrypt[i]) ) ) {
      // что-то не сработало
      printf( "FAILED\n" );
    } else {
      // сколько байтов было обработано (для варианта CTR - именно байтов, для блочных вариантов - с учётом добавленного заполнителя)
      uint32_t v_crypto_bytes = do_crypto_final( &v_st );
      // проверяем 
      if ( check_encrypt_results( v_crypto_bytes, g_results_aes128_ecb[i] ) ) {
        // пробуем расшифровать
        check_decrypt( &v_st, g_data_to_encrypt[i], g_aes128_key, g_iv );
      }
    }
    // AES-128 CBC
    printf( "AES-128 CBC [%d]...", i );
    // чистим буферы
    bzero( g_str, sizeof(g_str) );
    bzero( g_encrypted, sizeof(g_encrypted) );
    // считаем очередной пример
    do_crypto_init( &v_st
                  , CRYPTO_CONFIG_CORE_SEL_AES_M
                  , CRYPTO_CONFIG_MODE_SEL_CBC_M
                  , CRYPTO_CONFIG_ENCODE_M
                  , g_encrypted
                  , sizeof(g_encrypted)/sizeof(uint32_t)
                  , (const uint8_t *)g_aes128_key
                  , (const uint8_t *)g_iv
                  );
    // проверим итог do_crypto_update()
    if ( !do_crypto_update( &v_st, (const uint8_t *)g_data_to_encrypt[i], strlen(g_data_to_encrypt[i]) ) ) {
      // что-то не сработало
      printf( "FAILED\n" );
    } else {
      uint32_t v_crypto_bytes = do_crypto_final( &v_st );
      // проверяем 
      if ( check_encrypt_results( v_crypto_bytes, g_results_aes128_cbc[i] ) ) {
        // пробуем расшифровать
        check_decrypt( &v_st, g_data_to_encrypt[i], g_aes128_key, g_iv );
      }
    }
    // AES-128 CTR
    printf( "AES-128 CTR [%d]...", i );
    // чистим буферы
    bzero( g_str, sizeof(g_str) );
    bzero( g_encrypted, sizeof(g_encrypted) );
    // считаем очередной пример
    do_crypto_init( &v_st
                  , CRYPTO_CONFIG_CORE_SEL_AES_M
                  , CRYPTO_CONFIG_MODE_SEL_CTR_M
                  , CRYPTO_CONFIG_ENCODE_M
                  , g_encrypted
                  , sizeof(g_encrypted)/sizeof(uint32_t)
                  , (const uint8_t *)g_aes128_key
                  , (const uint8_t *)g_iv
                  );
    // проверим итог do_crypto_update()
    if ( !do_crypto_update( &v_st, (const uint8_t *)g_data_to_encrypt[i], strlen(g_data_to_encrypt[i]) ) ) {
      // что-то не сработало
      printf( "FAILED\n" );
    } else {
      uint32_t v_crypto_bytes = do_crypto_final( &v_st );
      if ( check_encrypt_results( v_crypto_bytes, g_results_aes128_ctr[i] ) ) {
        // пробуем расшифровать
        check_decrypt( &v_st, g_data_to_encrypt[i], g_aes128_key, g_iv );
      }
    }
    // Кузнечик
    test_kuznets( i, CRYPTO_CONFIG_MODE_SEL_ECB_M, "ECB" );
    test_kuznets( i, CRYPTO_CONFIG_MODE_SEL_CBC_M, "CBC" );
    test_kuznets( i, CRYPTO_CONFIG_MODE_SEL_CTR_M, "CTR" );
    // Магма
    test_magma( i, CRYPTO_CONFIG_MODE_SEL_ECB_M, "ECB" );
    test_magma( i, CRYPTO_CONFIG_MODE_SEL_CBC_M, "CBC" );
    test_magma( i, CRYPTO_CONFIG_MODE_SEL_CTR_M, "CTR" );
  }
  // BLAKE2 https://www.blake2.net/
  // для вариантов [1] и [3] тестовые векторы взяты готовые
  // для варианта [2] сгенерировано так:
  // echo -n "The quick brown fox jumps over the lazy dog" | b2sum -b --length=512
  uint8_t v_b2_hash[sizeof(g_b2b_hash)];
  // в тестовых векторах используется текст, ключ и результат
  blake2b( v_b2_hash, sizeof(v_b2_hash), g_b2_text, sizeof(g_b2_text), g_b2_key, sizeof(g_b2_key) );
  bool res = (0 == memcmp( v_b2_hash, g_b2b_hash, sizeof(g_b2b_hash) ));
  printf( "[1] BLAKE2B: %s\r\n", res ? "OK" : "ERROR" );
  // обычно ключ можно не использовать, что показано в следующем примере (и так же работает утилита b2sum)
  // удобство BLAKE2 в том, что можно указывать результирующий размер хэша от 1 до 64 байта (blake2b)
  blake2b( v_b2_hash, sizeof(v_b2_hash), g_b2b_str, strlen(g_b2b_str), 0, 0 );
  res = (0 == memcmp( v_b2_hash, g_b2b_strhash, sizeof(g_b2b_strhash) ));
  printf( "[2] BLAKE2B: %s\r\n", res ? "OK" : "ERROR" );
  // или от 1 до 32 байтов (blake2s), причём это не просто "обрезанный" хэш максимального размера,
  // это именно разный размер хэша, ну и blake2b и blake2s - это разные алгоритмы, blake2s больше подходит
  // для микроконтроллеров, но не совместим со "штатной" утилитой b2sum
  blake2s( v_b2_hash, sizeof(g_b2s_hash), g_b2_text, sizeof(g_b2_text), g_b2_key, sizeof(g_b2s_hash) );
  res = (0 == memcmp( v_b2_hash, g_b2s_hash, sizeof(g_b2s_hash) ));
  printf( "[3] BLAKE2S: %s\r\n", res ? "OK" : "ERROR" );
  //
  printf( "That's all, folks!\n" );
  //
  for (;;) {
    asm( "wfi" );
  }
}


void logBufferInHex(const unsigned char *src, int len) {
  int i, c, k;
  char ln[96];
  char *ucPtr;

  while (len) {
    // start line pointer
    ucPtr = ln;
    // first send address
    for (i = 28; i >= 0; i -= 4) {
      c = (((unsigned int)src) >> i) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
    }
    // send 16 or less hex bytes
    for (i = 0; i < 16 && len > 0; i++, len--) {
      //
      *ucPtr++ = ' ';
      //
      c = (*src >> 4) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
      c = (*src++) & 0x0F;
      *ucPtr++ = c < 10 ? c + 48 : c + 55;
    }
    for (k = i; k < 16; ++k) {
      //
      *ucPtr++ = ' ';
      *ucPtr++ = ' ';
      *ucPtr++ = ' ';
    }
    //
    *ucPtr++ = ' ';
    // send bytes as symbols
    for (; i > 0; i--) {
      //
      c = *(src - i);
      //
      *ucPtr++ = (c >= 0x20 && c <= 0x7F) ? c : '.';
    }
    // make eol
    // *ucPtr++ = 0x0D;
    // *ucPtr++ = 0x0A;
    *ucPtr = 0x00;
    // send to remote
    printf( "%s\n", ln );
  }
}
