#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>

#include <vector>
#include <unordered_set>
#include <algorithm>


typedef struct {
  uint64_t m_ROM;
  int m_last_diff;
  bool m_found;
} onewire_enumerate_s;

typedef void UART_TypeDef;


std::vector<uint64_t> g_ids;
std::vector<uint64_t> g_enabled_ids;
std::vector<uint64_t> g_tmp_ids;
std::unordered_set<uint64_t> g_ids_set;

int g_bit_idx = 0;
bool g_read_inv = false;


//
void delay_ms( uint32_t ) {
}


// тут пусто
static void uart1_set_speed( UART_TypeDef *, uint32_t ) {
}


// собираем текущий бит в прямом или инверсном виде со всех участвующих идентификаторов по И
bool onewire_read_bit( UART_TypeDef * ) {
  uint64_t v_mask = (1ul << g_bit_idx);
  uint64_t v_result = v_mask;
  for ( uint64_t i: g_enabled_ids ) {
    v_result &= g_read_inv ? i ^ v_mask : i;
  }
  g_read_inv = !g_read_inv;
  return 0 != v_result;
}


// среди участвующих идентификаторов оставить только те, у которых текущий бит соответствует a_bit
void onewire_write_bit( UART_TypeDef *, bool a_bit ) {
  g_tmp_ids = std::move( g_enabled_ids );
  uint64_t v_mask = (1ul << g_bit_idx);
  uint64_t v_bit = a_bit ? v_mask : 0;
  g_enabled_ids.clear();
  for ( uint64_t i: g_tmp_ids ) {
    if ( (i & v_mask) == v_bit ) {
      g_enabled_ids.push_back( i );
    }
  }
  ++g_bit_idx;
  g_read_inv = false;
}


// здесь пусто
void onewire_write_byte( UART_TypeDef *, uint8_t ) {
}


// состояние перед очередным просмотром битов, все диентификаторы участвуют
bool onewire_device_present( UART_TypeDef * ) {
  g_bit_idx = 0;
  g_read_inv = false;
  g_enabled_ids.resize( g_ids.size() );
  std::copy( g_ids.begin(), g_ids.end(), g_enabled_ids.begin() );
  return true;
}


#include "one_wire_uart_enumerate.h"


// набрать указанное количество случайных идентификаторов
void init_test_random( int a_count ) {
  g_ids_set.clear();
  g_ids.clear();
  for ( int i = 0; i < a_count; ) {
    uint64_t v_rnd = (random() << 33) | (random() << 2) | (random() & 0x03);
    if ( 0 == g_ids_set.count( v_rnd ) ) {
      g_ids_set.insert( v_rnd );
      g_ids.push_back( v_rnd );
      ++i;
    }
  }
}


// набрать указанное количество последовательных идентификаторов начиная с нуля
void init_test_sequental( int a_count ) {
  g_ids_set.clear();
  g_ids.clear();
  for ( int i = 0; i < a_count; ++i ) {
    g_ids_set.insert( i );
    g_ids.push_back( i );
  }  
}


// "вычухать" все идентификаторы
bool do_test() {
  onewire_enumerate_s v_en;
  size_t k = 0;
  for ( bool v_next = onewire_enumerate_devices( NULL, &v_en, true ); v_en.m_found; v_next = onewire_enumerate_devices( NULL, &v_en, false ) ) {
    ++k;
    if ( 0 == g_ids_set.count( v_en.m_ROM ) ) {
      printf( "Found unexpected ID %016lX\n", v_en.m_ROM );
      return false;
    }
    g_ids_set.erase( v_en.m_ROM );
    if ( !v_next ) {
      break;
    }
    if ( k > g_ids.size() ) {
      printf( "Extra search cycle\n" );
      return false;
    }
  }
  printf( "Test passed, %lu IDs from %lu enumerated\n", k, g_ids.size() );
  return true;
}


int main( int, char ** ) {
  srandom( ::time( nullptr ) );
  init_test_random( 1 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_random( 2 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_random( 3 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_random( 4 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_random( 5 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_random( 255 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_random( 256 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_random( 257 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_random( 1023 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_random( 1024 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_random( 1025 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_random( 49 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_sequental( 0 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_sequental( 1 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_sequental( 2 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_sequental( 3 );
  if ( !do_test() ) {
    return 1;
  }
  init_test_sequental( 256 );
  if ( !do_test() ) {
    return 1;
  }
  return 0;
}
