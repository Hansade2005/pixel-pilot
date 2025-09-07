"use client"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BookOpen, Video, Play, Users, Clock, Star, ArrowRight, MessageSquare, Code, Rocket, Layers, Settings,
  Search, Filter, CheckCircle, TrendingUp, Award, Target, Lightbulb, Zap, BarChart3, X, GraduationCap,
  PlayCircle, FileText, Trophy, Calendar, User, Check, Lock, Unlock, Download, Share2,
  ChevronDown, ChevronRight, Book, Brain, Code2, Palette, Database, Globe, Smartphone, Award as CertificateIcon,
  ArrowLeft, ExternalLink, UserCheck, MessageCircle
} from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useEffect, useState } from "react"

interface Course {
  id: string
  title: string
  description: string
  longDescription: string
  instructor: string
  avatar: string
  duration: string
  level: string
  category: string
  rating: number
  students: number
  price: string
  featured: boolean
  enrolled: boolean
  progress: number
  completed: boolean
  certificateAvailable: boolean
  skills: string[]
  prerequisites: string[]
  content: {
    overview: string
    learningObjectives: string[]
    modules: any[]
    resources: any[]
    tutoring: any
  }
}

interface UserProgress {
  userId: string
  enrolledCourses: string[]
  completedCourses: string[]
  courseProgress: { [courseId: string]: { [moduleId: string]: { [lessonId: string]: boolean } } }
  certificates: string[]
  totalTimeSpent: number
  lastActive: string
}

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [course, setCourse] = useState<Course | null>(null)
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState(0)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]))

  // Image API utility function
  const getCourseThumbnail = (courseTitle: string, seed: number) => {
    const description = `${courseTitle} course thumbnail, professional educational content`
    return `https://api.a0.dev/assets/image?text=${encodeURIComponent(description)}&aspect=1:1&seed=${seed}`
  }

  // Load course and user progress
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load courses from JSON
        const coursesResponse = await fetch('/courses.json')
        const coursesData = await coursesResponse.json()

        // Find the specific course
        const foundCourse = coursesData.courses.find((c: Course) => c.id === slug)
        if (!foundCourse) {
          router.push('/learn')
          return
        }

        // Load user progress
        const progress = localStorage.getItem('pixelPilotUserProgress')
        if (progress) {
          const progressData = JSON.parse(progress)
          setUserProgress(progressData)

          // Check if user is enrolled
          if (progressData.enrolledCourses.includes(foundCourse.id)) {
            foundCourse.enrolled = true
            foundCourse.progress = calculateProgress(foundCourse.id, progressData)
          }
        }

        setCourse(foundCourse)
      } catch (error) {
        console.error('Failed to load course:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [slug, router])

  const calculateProgress = (courseId: string, progress: UserProgress): number => {
    const courseProgress = progress.courseProgress[courseId]
    if (!courseProgress) return 0

    let totalLessons = 0
    let completedLessons = 0

    Object.values(courseProgress).forEach((module: any) => {
      Object.values(module).forEach((lesson: any) => {
        totalLessons++
        if (lesson) completedLessons++
      })
    })

    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  }

  const enrollInCourse = () => {
    if (!course || !userProgress) return

    const updatedProgress = {
      ...userProgress,
      enrolledCourses: [...userProgress.enrolledCourses, course.id],
      courseProgress: {
        ...userProgress.courseProgress,
        [course.id]: {}
      },
      lastActive: new Date().toISOString()
    }

    setUserProgress(updatedProgress)
    localStorage.setItem('pixelPilotUserProgress', JSON.stringify(updatedProgress))

    setCourse({ ...course, enrolled: true })
  }

  const completeLesson = (moduleId: string, lessonId: string) => {
    if (!course || !userProgress) return

    const updatedProgress = {
      ...userProgress,
      courseProgress: {
        ...userProgress.courseProgress,
        [course.id]: {
          ...userProgress.courseProgress[course.id],
          [moduleId]: {
            ...userProgress.courseProgress[course.id]?.[moduleId],
            [lessonId]: true
          }
        }
      },
      lastActive: new Date().toISOString()
    }

    setUserProgress(updatedProgress)
    localStorage.setItem('pixelPilotUserProgress', JSON.stringify(updatedProgress))

    // Update course progress
    const newProgress = calculateProgress(course.id, updatedProgress)
    setCourse({ ...course, progress: newProgress })
  }

  const toggleModule = (index: number) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedModules(newExpanded)
  }

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "beginner": return "bg-green-600"
      case "intermediate": return "bg-yellow-600"
      case "advanced": return "bg-red-600"
      case "all levels": return "bg-purple-600"
      default: return "bg-gray-600"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 lovable-gradient" />
        <div className="absolute inset-0 noise-texture" />
        <Navigation />
        <div className="relative z-10 pt-16 pb-24 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading course...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 lovable-gradient" />
        <div className="absolute inset-0 noise-texture" />
        <Navigation />
        <div className="relative z-10 pt-16 pb-24 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Course Not Found</h2>
            <p className="text-gray-400 mb-6">The course you're looking for doesn't exist.</p>
            <Link href="/learn">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Courses
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 lovable-gradient" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 noise-texture" />

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative z-10 pt-16 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link href="/learn" className="text-gray-400 hover:text-white flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Link>
          </div>

          {/* Course Header */}
          <div className="mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Badge className="bg-purple-600 text-white">{course.category}</Badge>
                  <Badge className={getDifficultyColor(course.level)}>
                    {course.level}
                  </Badge>
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  {course.title}
                </h1>

                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  {course.longDescription}
                </p>

                {/* Course Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{course.duration}</div>
                    <div className="text-gray-400">Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{course.students.toLocaleString()}</div>
                    <div className="text-gray-400">Students</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{course.rating}</div>
                    <div className="text-gray-400">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{course.content.modules.length}</div>
                    <div className="text-gray-400">Modules</div>
                  </div>
                </div>

                {/* Instructor */}
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img src="/hans.png" alt={course.instructor} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">{course.instructor}</div>
                    <div className="text-gray-400">Founder & CEO, Pixel Pilot</div>
                    <div className="text-gray-500 text-sm">Also known as Hans Ade</div>
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4">What you'll learn:</h3>
                  <div className="flex flex-wrap gap-2">
                    {course.skills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="border-gray-600 text-gray-400">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {course.enrolled ? (
                    <>
                      <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                        <PlayCircle className="w-5 h-5 mr-2" />
                        Continue Learning
                      </Button>
                      {course.progress > 0 && (
                        <div className="flex items-center space-x-2 text-gray-300">
                          <span>Progress:</span>
                          <span className="font-semibold">{course.progress}%</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <Button
                      size="lg"
                      className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                      onClick={enrollInCourse}
                    >
                      <BookOpen className="w-5 h-5 mr-2" />
                      Enroll Now - {course.price}
                    </Button>
                  )}
                </div>
              </div>

              {/* Course Thumbnail */}
              <div className="lg:sticky lg:top-24">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                  <div className="aspect-video bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg mb-6 flex items-center justify-center">
                    <img
                      src={getCourseThumbnail(course.title, course.students)}
                      alt={course.title}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLElement
                        target.style.display = 'none'
                        const sibling = target.nextElementSibling as HTMLElement
                        if (sibling) sibling.style.display = 'flex'
                      }}
                    />
                    <div className="w-full h-full flex items-center justify-center rounded-lg" style={{ display: 'none' }}>
                      <GraduationCap className="w-16 h-16 text-white" />
                    </div>
                  </div>

                  {course.enrolled && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">Course Progress</span>
                        <span className="text-white">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  )}

                  {/* Course Actions */}
                  <div className="space-y-3">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Course
                    </Button>
                    <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white">
                      <Download className="w-4 h-4 mr-2" />
                      Download Syllabus
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Course Content Tabs */}
          <div className="mb-12">
            <div className="border-b border-gray-700/50">
              <nav className="flex space-x-8">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'curriculum', label: 'Curriculum' },
                  { id: 'resources', label: 'Resources' },
                  { id: 'tutoring', label: 'Tutoring' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModule(activeModule === 0 ? 1 : 0)} // Simple toggle for demo
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeModule === 0
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Course Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Course Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-6">{course.content.overview}</p>

                  <h4 className="text-lg font-semibold text-white mb-4">Learning Objectives</h4>
                  <ul className="space-y-2">
                    {course.content.learningObjectives.map((objective, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">{objective}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm mb-6">
                <CardHeader>
                  <CardTitle className="text-white">Prerequisites</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {course.prerequisites.map((prereq, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-300">{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Course Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(course.rating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-white font-semibold">{course.rating}</span>
                    <span className="text-gray-400">({course.students.toLocaleString()} reviews)</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Course Curriculum */}
          <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm mb-12">
            <CardHeader>
              <CardTitle className="text-white">Course Curriculum</CardTitle>
              <CardDescription className="text-gray-400">
                {course.content.modules.length} modules • Complete learning path
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {course.content.modules.map((module, moduleIndex) => (
                  <div key={module.id} className="border border-gray-700/50 rounded-lg">
                    <button
                      onClick={() => toggleModule(moduleIndex)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/30 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                          {moduleIndex + 1}
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">{module.title}</h4>
                          <p className="text-gray-400 text-sm">{module.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400 text-sm">{module.duration}</span>
                        {expandedModules.has(moduleIndex) ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {expandedModules.has(moduleIndex) && (
                      <div className="px-4 pb-4">
                        <div className="space-y-2">
                          {module.lessons.map((lesson: any, lessonIndex: number) => (
                            <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                                  {lesson.type === 'video' ? (
                                    <Play className="w-3 h-3 text-gray-300" />
                                  ) : lesson.type === 'text' ? (
                                    <FileText className="w-3 h-3 text-gray-300" />
                                  ) : (
                                    <Code className="w-3 h-3 text-gray-300" />
                                  )}
                                </div>
                                <div>
                                  <h5 className="text-white text-sm font-medium">{lesson.title}</h5>
                                  <p className="text-gray-400 text-xs">{lesson.duration}</p>
                                </div>
                              </div>

                              {course.enrolled ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-600 text-gray-300 hover:text-white"
                                  onClick={() => completeLesson(module.id, lesson.id)}
                                >
                                  {lesson.completed ? (
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </Button>
                              ) : (
                                <Lock className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resources Section */}
          {course.content.resources && course.content.resources.length > 0 && (
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm mb-12">
              <CardHeader>
                <CardTitle className="text-white">Additional Resources</CardTitle>
                <CardDescription className="text-gray-400">
                  Helpful materials and references for this course
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.content.resources.map((resource, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <ExternalLink className="w-5 h-5 text-purple-400" />
                        <div>
                          <h5 className="text-white text-sm font-medium">{resource.title}</h5>
                          <p className="text-gray-400 text-xs">{resource.description}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="border-gray-600">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tutoring Section */}
          {course.content.tutoring && course.content.tutoring.available && (
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Personal Tutoring</CardTitle>
                <CardDescription className="text-gray-400">
                  Get personalized help from our expert tutors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {course.content.tutoring.sessions.map((session: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center space-x-3 mb-3">
                        <UserCheck className="w-5 h-5 text-green-400" />
                        <h5 className="text-white font-medium">{session.title}</h5>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{session.duration} • {session.type}</p>
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={!session.available}
                      >
                        {session.available ? 'Book Session' : 'Unavailable'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
