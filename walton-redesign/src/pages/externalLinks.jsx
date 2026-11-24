import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Headphones, Wrench, MapPin, Heart, Phone, ShoppingBag, Columns2, Compass, Trash2, Clock } from 'lucide-react'
import { Link } from '../lib/router'
import { CATEGORIES, COUNT, FAQ, P, PRODUCTS } from '../lib/data'
import { useStore } from '../lib/store'
import { spring } from '../lib/motion'
import { AnimatedNumber, Breadcrumbs, Empty, Item, PageHead, Reveal, SplitText, Stagger, spotlight } from '../components/ui'
import Accordion from '../components/Accordion'
import ProductCard from '../components/ProductCard'


export const ext = { target: '_blank', rel: 'noopener noreferrer' }
