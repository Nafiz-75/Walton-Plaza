import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { spring } from '../lib/motion'

export default function Accordion({ items, initial = null }) {
  const [open, setOpen] = useState(initial)
  return (
    <div className="accordion">
      {items.map(([k, q, a]) => {
        const on = open === k
        return (
          <div key={k} className={'acc-item' + (on ? ' on' : '')}>
            <h3>
              <button type="button" aria-expanded={on} aria-controls={`acc-${k}`} id={`acc-h-${k}`} onClick={() => setOpen(on ? null : k)}>
                {q}
                <motion.span className="acc-icon" animate={{ rotate: on ? 45 : 0 }} transition={spring.snappy}><Plus className="icon" /></motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {on && (
                <motion.div id={`acc-${k}`} role="region" aria-labelledby={`acc-h-${k}`} className="acc-panel"
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="acc-inner">{a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
