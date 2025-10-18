import React from 'react'

interface TestProps {
  name: string
  age: number
}

const TestComponent: React.FC<TestProps> = ({ name, age }) => {
  return (
    <div>
      <h1>Hello {name}</h1>
      <p>Age: {age}</p>
    </div>
  )
}

export default TestComponent