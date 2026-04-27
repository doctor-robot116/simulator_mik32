#include <stdint.h>


// задержка как минимум на a_ms - 1 миллисекунд
#ifdef __cplusplus
extern "C" {
#endif

extern uint64_t g_mtimecmp;
extern volatile uint32_t g_milliseconds;
void delay_ms( uint32_t a_ms );
void trap_handler(void);
bool process_irqs(void);
void process_timer(void);

#ifdef __cplusplus
}
#endif
