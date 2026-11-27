export const gridRecord = () => ({
  version: 1,
  context: { url: '/settings', selector: '#dialog', state: 'default', viewport: { width: 128, height: 128 } },
  capture: { path: 'capture.png', clip: { x: 0, y: 0, width: 128, height: 128 } },
  grid: { step: 4, origin: { x: 10.5, y: 10.5 }, tolerance: 0.25, adopted: true, basis: '가상 DESIGN의 4px 간격 기준' },
  elements: [
    { id: 'title', rect: { x: 10.5, y: 10.5, width: 80, height: 20 } },
    { id: 'body', rect: { x: 10.5, y: 42.5, width: 80, height: 40 } },
  ],
  checks: [
    { id: 'spacing', kind: 'gap', axis: 'y', from: { element: 'title', edge: 'bottom' }, to: { element: 'body', edge: 'top' } },
    { id: 'left', kind: 'alignment', axis: 'x', from: { element: 'title', edge: 'left' }, to: { element: 'body', edge: 'left' } },
    { id: 'origin', kind: 'grid', axis: 'x', from: { element: 'body', edge: 'left' } },
  ],
})
