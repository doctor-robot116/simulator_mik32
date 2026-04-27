// определить ID очередного устройства на шине 1-wire, если a_first == true,
// то это начальная итерация сканирования, в *a_data будут занесены начальные значения
// если вернёт true, то остались ещё "непойманные" идентификаторы
// если в a_data.m_found == true, то в a_data->m_ROM лежит ID очередного найденного устройства
// для продолжения сканирования, если этот ID нужно запомнить, скопируйте его
// и снова вызывайте onewire_enumerate_devices() с параметром a_first == false
bool onewire_enumerate_devices( UART_TypeDef * a_uart, onewire_enumerate_s * a_data, bool a_first ) {
  // подготовка нужна?
  if ( a_first ) {
    // сброс и проверка того, что на шине хоть кто-нибудь есть
    if ( !onewire_device_present( a_uart ) ) {
      return false;
    }
    // установка начальных значений
    a_data->m_ROM = 0;
    a_data->m_last_diff = -1;
  }
  //
  uint64_t v_ROM_mask = 1;
  bool v_bit_ord, v_bit_inv, v_bit_dir;
  int v_last_zero = -1;
  a_data->m_found = false;
  // выдача команды "Search ROM"
  onewire_write_byte( a_uart, ONEWIRE_CMD_SEARCH_ROM );
  // сканирование 64 битов ID
  for ( int v_bit_idx = 0; v_bit_idx < 64; ++v_bit_idx ) {
    // читаем "прямой" бит
    v_bit_ord = onewire_read_bit( a_uart );
    // читаем инверсный бит
    v_bit_inv = onewire_read_bit( a_uart );
    // если оба == 1
    if ( v_bit_ord && v_bit_inv ) {
      // то никто не ответил, сканирование прекращаем
      onewire_device_present( a_uart );
      return false;
    }
    // если биты разные (устройства с одинаковым значением бита ID)
    if ( v_bit_ord != v_bit_inv ) {
      // тогда выбираем значение "прямого" бита
      v_bit_dir = v_bit_ord;
    } else {
      // оба бита == 0 (устройства с разными значениями бита ID)
      if ( v_bit_idx == a_data->m_last_diff ) {
        // если номер текущего бита совпал с номером бита, где прежде были обнаружены устройства
        // с разными значениями бита, то выбираем значение бита = 1
        v_bit_dir = true;
      } else {
        // если номер текущего бита больше номера бита, где прежде были обнаружены устройства
        // с разными значениями бита
        if ( v_bit_idx > a_data->m_last_diff ) {
          // то выбираем значение бита = 0
          v_bit_dir = false;
        } else {
          // иначе выбираем бит из предыдущего найденного ID
          v_bit_dir = (0 != (a_data->m_ROM & v_ROM_mask));
        }
        // если выбран бит == 0
        if ( !v_bit_dir ) {
          // запомним номер бита, для которого был выбран бит == 0
          v_last_zero = v_bit_idx;
        }
      }
    }
    // заносим выбранный бит в ID
    if ( v_bit_dir ) {
      a_data->m_ROM |= v_ROM_mask;
    } else {
      a_data->m_ROM &= ~v_ROM_mask;
    }
    // выдаём выбранный бит в шину, чтобы 
    onewire_write_bit( a_uart, v_bit_dir );
    // сдвигаем маску бита на следующий
    v_ROM_mask <<= 1;
  }
  // для следующего поиска ID обновляем номер бита, на котором были разные биты
  // от устройств и был выбран бит == 0
  a_data->m_last_diff = v_last_zero;
  // сброс для нового сканирования
  onewire_device_present( a_uart );
  // укажем, что идентификатор найден
  a_data->m_found = true;
  // вернём признак того, что остались ещё "не окученные" идентификаторы
  return (v_last_zero >= 0);
}
