import { css, html, LitElement, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('wokwi-mik32-amur')
export class MIK32AmurElement extends LitElement {
  @property({ type: Boolean }) ledPower = false;

  static get styles() {
    return css`
      :host {
        display: inline-block;
      }
      svg {
        overflow: visible;
      }
    `;
  }

  render() {
    const ledGlow = this.ledPower ? '#22ff44' : '#115522';
    const ledFill = this.ledPower ? '#44ff66' : '#1a3a28';
    const ledFilter = this.ledPower ? 'url(#pwrGlow)' : 'none';

    return html`
      <svg
        width="220"
        height="280"
        viewBox="0 0 220 280"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="pwrGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="chipShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.6" />
          </filter>
          <linearGradient id="pcbGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1a3a28" />
            <stop offset="100%" stop-color="#0d2018" />
          </linearGradient>
          <linearGradient id="chipGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2a2a2e" />
            <stop offset="100%" stop-color="#18181c" />
          </linearGradient>
        </defs>

        <!-- PCB board -->
        <rect x="4" y="4" width="212" height="272" rx="6" fill="url(#pcbGrad)" stroke="#2a5a40" stroke-width="1.5" />

        <!-- PCB silkscreen border -->
        <rect x="10" y="10" width="200" height="260" rx="4" fill="none" stroke="#1e4a30" stroke-width="0.5" stroke-dasharray="4,3" />

        <!-- Corner mounting holes -->
        <circle cx="18" cy="18" r="4" fill="#0a1a10" stroke="#2a5a40" stroke-width="0.8" />
        <circle cx="202" cy="18" r="4" fill="#0a1a10" stroke="#2a5a40" stroke-width="0.8" />
        <circle cx="18" cy="262" r="4" fill="#0a1a10" stroke="#2a5a40" stroke-width="0.8" />
        <circle cx="202" cy="262" r="4" fill="#0a1a10" stroke="#2a5a40" stroke-width="0.8" />

        <!-- GPIO_0 pins — left side (P0_0–P0_15) -->
        ${Array.from({ length: 16 }, (_, i) => svg`
          <rect x="4" y="${38 + i * 13}" width="10" height="5" rx="1" fill="#c8a060" />
          <text x="17" y="${42 + i * 13}" font-family="monospace" font-size="6" fill="#4ec9b0" opacity="0.7">P0_${i}</text>
        `)}

        <!-- GPIO_1 pins — right side (P1_0–P1_15) -->
        ${Array.from({ length: 16 }, (_, i) => svg`
          <rect x="206" y="${38 + i * 13}" width="10" height="5" rx="1" fill="#c8a060" />
          <text x="${203 - (i < 10 ? 18 : 22)}" y="${42 + i * 13}" font-family="monospace" font-size="6" fill="#9cdcfe" opacity="0.7" text-anchor="end">P1_${i}</text>
        `)}

        <!-- GPIO_2 pins — bottom (P2_0–P2_7) -->
        ${Array.from({ length: 8 }, (_, i) => svg`
          <rect x="${28 + i * 22}" y="268" width="5" height="10" rx="1" fill="#c8a060" />
          <text x="${30 + i * 22}" y="${264}" font-family="monospace" font-size="5.5" fill="#dcdcaa" opacity="0.7" text-anchor="middle">P2_${i}</text>
        `)}

        <!-- Power pins — top -->
        <rect x="54" y="2" width="5" height="10" rx="1" fill="#c8a060" />
        <text x="57" y="18" font-family="monospace" font-size="5" fill="#f9a825" text-anchor="middle">VCC</text>
        <rect x="76" y="2" width="5" height="10" rx="1" fill="#c8a060" />
        <text x="79" y="18" font-family="monospace" font-size="5" fill="#888" text-anchor="middle">GND</text>
        <rect x="98" y="2" width="5" height="10" rx="1" fill="#c8a060" />
        <text x="101" y="18" font-family="monospace" font-size="5" fill="#ce9178" text-anchor="middle">RST</text>
        <rect x="120" y="2" width="5" height="10" rx="1" fill="#c8a060" />
        <text x="123" y="18" font-family="monospace" font-size="5" fill="#4fc1ff" text-anchor="middle">JTAG</text>

        <!-- Chip body -->
        <rect x="48" y="48" width="124" height="168" rx="4" fill="url(#chipGrad)" stroke="#3a3a44" stroke-width="1" filter="url(#chipShadow)" />

        <!-- Chip notch (pin 1 indicator) -->
        <circle cx="60" cy="60" r="5" fill="#111115" />

        <!-- Chip die (inner square) -->
        <rect x="62" y="62" width="96" height="140" rx="2" fill="#0e0e12" stroke="#222228" stroke-width="0.5" />

        <!-- Chip logo / label area -->
        <rect x="68" y="72" width="84" height="50" rx="2" fill="#141418" />
        <text x="110" y="94" font-family="monospace" font-size="9" font-weight="bold" fill="#4ec9b0" text-anchor="middle" letter-spacing="1">МИКРОН</text>
        <text x="110" y="106" font-family="monospace" font-size="7.5" fill="#9cdcfe" text-anchor="middle" letter-spacing="0.5">MIK32</text>
        <text x="110" y="117" font-family="monospace" font-size="6.5" fill="#ce9178" text-anchor="middle">АМУР</text>

        <!-- CPU core box -->
        <rect x="68" y="130" width="38" height="34" rx="2" fill="#0e1e18" stroke="#2a5a40" stroke-width="0.6" />
        <text x="87" y="144" font-family="monospace" font-size="5.5" fill="#4ec9b0" text-anchor="middle">RISC-V</text>
        <text x="87" y="153" font-family="monospace" font-size="5" fill="#6a9a80" text-anchor="middle">32-bit</text>
        <text x="87" y="161" font-family="monospace" font-size="4.5" fill="#4a7a60" text-anchor="middle">RV32IMAFCZk</text>

        <!-- RAM block -->
        <rect x="114" y="130" width="34" height="15" rx="1.5" fill="#0a1a28" stroke="#1a4a8a" stroke-width="0.6" />
        <text x="131" y="140" font-family="monospace" font-size="5" fill="#9cdcfe" text-anchor="middle">SRAM 16K</text>

        <!-- Flash block -->
        <rect x="114" y="149" width="34" height="15" rx="1.5" fill="#1a0a28" stroke="#4a1a8a" stroke-width="0.6" />
        <text x="131" y="159" font-family="monospace" font-size="5" fill="#ce9178" text-anchor="middle">OTP 256K</text>

        <!-- Peripheral blocks row -->
        <rect x="68" y="170" width="24" height="12" rx="1" fill="#1a1a0a" stroke="#5a5a1a" stroke-width="0.5" />
        <text x="80" y="178" font-family="monospace" font-size="4.5" fill="#dcdcaa" text-anchor="middle">SPI×3</text>

        <rect x="95" y="170" width="22" height="12" rx="1" fill="#1a1a0a" stroke="#5a5a1a" stroke-width="0.5" />
        <text x="106" y="178" font-family="monospace" font-size="4.5" fill="#dcdcaa" text-anchor="middle">I2C×2</text>

        <rect x="120" y="170" width="22" height="12" rx="1" fill="#1a1a0a" stroke="#5a5a1a" stroke-width="0.5" />
        <text x="131" y="178" font-family="monospace" font-size="4.5" fill="#dcdcaa" text-anchor="middle">UART×2</text>

        <!-- Frequency label -->
        <text x="110" y="198" font-family="monospace" font-size="5.5" fill="#555" text-anchor="middle">32 MHz / 4 MHz OSC</text>

        <!-- Part number -->
        <text x="110" y="210" font-family="monospace" font-size="5" fill="#444" text-anchor="middle">MIK32AMUR-01</text>

        <!-- PWR LED -->
        <circle cx="180" cy="58" r="5" fill="${ledFill}" stroke="${ledGlow}" stroke-width="1" filter="${ledFilter}" />
        <text x="180" y="70" font-family="monospace" font-size="5.5" fill="${this.ledPower ? '#22ff44' : '#2a5a40'}" text-anchor="middle">PWR</text>

        <!-- Silkscreen label bottom -->
        <text x="110" y="253" font-family="monospace" font-size="6" fill="#1e4a30" text-anchor="middle">MIK32-AMUR-DEV</text>
      </svg>
    `;
  }
}
