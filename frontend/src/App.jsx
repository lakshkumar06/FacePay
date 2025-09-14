import FaceRecognition from './components/FaceRecognition'
import FaceRegistration from './components/FaceRegistration'
import './App.css'

function App() {
  // Check URL parameters to determine which component to render
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page');
  
  // If page=register, show registration page, otherwise show checkout page
  if (page === 'register') {
    return (
      <div className="min-h-screen bg-gray-50">
        <FaceRegistration />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <FaceRecognition />
    </div>
  )
}

export default App
