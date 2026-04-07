import Navbar from './Navbar'

export default function AlumniLayout({ children }) {
  return (
    <div className="min-h-screen bg-page-bg">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
