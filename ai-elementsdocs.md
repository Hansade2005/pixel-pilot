Usage

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';

<Reasoning className="w-full" isStreaming={false}>
  <ReasoningTrigger />
  <ReasoningContent>I need to computer the square of 2.</ReasoningContent>
</Reasoning>


Task compoenent usage  

Usage with AI SDK
Build a mock async programming agent using experimental_generateObject.

Add the following component to your frontend:

app/page.tsx

'use client';

import { experimental_useObject as useObject } from '@ai-sdk/react';
import {
  Task,
  TaskItem,
  TaskItemFile,
  TaskTrigger,
  TaskContent,
} from '@/components/ai-elements/task';
import { Button } from '@/components/ui/button';
import { tasksSchema } from '@/app/api/task/route';
import {
  SiReact,
  SiTypescript,
  SiJavascript,
  SiCss,
  SiHtml5,
  SiJson,
  SiMarkdown,
} from '@icons-pack/react-simple-icons';

const iconMap = {
  react: { component: SiReact, color: '#149ECA' },
  typescript: { component: SiTypescript, color: '#3178C6' },
  javascript: { component: SiJavascript, color: '#F7DF1E' },
  css: { component: SiCss, color: '#1572B6' },
  html: { component: SiHtml5, color: '#E34F26' },
  json: { component: SiJson, color: '#000000' },
  markdown: { component: SiMarkdown, color: '#000000' },
};

const TaskDemo = () => {
  const { object, submit, isLoading } = useObject({
    api: '/api/agent',
    schema: tasksSchema,
  });

  const handleSubmit = (taskType: string) => {
    submit({ prompt: taskType });
  };

  const renderTaskItem = (item: any, index: number) => {
    if (item?.type === 'file' && item.file) {
      const iconInfo = iconMap[item.file.icon as keyof typeof iconMap];
      if (iconInfo) {
        const IconComponent = iconInfo.component;
        return (
          <span className="inline-flex items-center gap-1" key={index}>
            {item.text}
            <TaskItemFile>
              <IconComponent
                color={item.file.color || iconInfo.color}
                className="size-4"
              />
              <span>{item.file.name}</span>
            </TaskItemFile>
          </span>
        );
      }
    }
    return item?.text || '';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      <div className="flex flex-col h-full">
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            onClick={() => handleSubmit('React component development')}
            disabled={isLoading}
            variant="outline"
          >
            React Development
          </Button>
        </div>

        <div className="flex-1 overflow-auto space-y-4">
          {isLoading && !object && (
            <div className="text-muted-foreground">Generating tasks...</div>
          )}

          {object?.tasks?.map((task: any, taskIndex: number) => (
            <Task key={taskIndex} defaultOpen={taskIndex === 0}>
              <TaskTrigger title={task.title || 'Loading...'} />
              <TaskContent>
                {task.items?.map((item: any, itemIndex: number) => (
                  <TaskItem key={itemIndex}>
                    {renderTaskItem(item, itemIndex)}
                  </TaskItem>
                ))}
              </TaskContent>
            </Task>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskDemo;
Add the following route to your backend:

app/api/agent.ts

import { streamObject } from 'ai';
import { z } from 'zod';

export const taskItemSchema = z.object({
  type: z.enum(['text', 'file']),
  text: z.string(),
  file: z
    .object({
      name: z.string(),
      icon: z.string(),
      color: z.string().optional(),
    })
    .optional(),
});

export const taskSchema = z.object({
  title: z.string(),
  items: z.array(taskItemSchema),
  status: z.enum(['pending', 'in_progress', 'completed']),
});

export const tasksSchema = z.object({
  tasks: z.array(taskSchema),
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = streamObject({
    model: 'openai/gpt-4o',
    schema: tasksSchema,
    prompt: `You are an AI assistant that generates realistic development task workflows. Generate a set of tasks that would occur during ${prompt}.

    Each task should have:
    - A descriptive title
    - Multiple task items showing the progression
    - Some items should be plain text, others should reference files
    - Use realistic file names and appropriate file types
    - Status should progress from pending to in_progress to completed

    For file items, use these icon types: 'react', 'typescript', 'javascript', 'css', 'html', 'json', 'markdown'

    Generate 3-4 tasks total, with 4-6 items each.`,
  });

  return result.toTextStreamResponse();
}
Features
Visual icons for pending, in-progress, completed, and error states
Expandable content for task descriptions and additional information
Built-in progress counter showing completed vs total tasks
Optional progressive reveal of tasks with customizable timing
Support for custom content within task items
Full type safety with proper TypeScript definitions
Keyboard navigation and screen reader support
Props
<Task />
[...props]?:
React.ComponentProps<typeof Collapsible>
Any other props are spread to the root Collapsible component.
<TaskTrigger />
title:
string
The title of the task that will be displayed in the trigger.
[...props]?:
React.ComponentProps<typeof CollapsibleTrigger>
Any other props are spread to the CollapsibleTrigger component.
<TaskContent />
[...props]?:
React.ComponentProps<typeof CollapsibleContent>
Any other props are spread to the CollapsibleContent component.
<TaskItem />
[...props]?:
React.ComponentProps<"div">
Any other props are spread to the underlying div.
<TaskItemFile />
[...props]?:
React.ComponentProps<"div">
Any other props are spread to the underlying div.


Chain of Thoughts Reasoning   compeoent usage 

Usage

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtImage,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought';

<ChainOfThought defaultOpen>
  <ChainOfThoughtHeader />
  <ChainOfThoughtContent>
    <ChainOfThoughtStep
      icon={SearchIcon}
      label="Searching for information"
      status="complete"
    >
      <ChainOfThoughtSearchResults>
        <ChainOfThoughtSearchResult>
          Result 1
        </ChainOfThoughtSearchResult>
      </ChainOfThoughtSearchResults>
    </ChainOfThoughtStep>
  </ChainOfThoughtContent>
</ChainOfThought>
Features
Collapsible interface with smooth animations powered by Radix UI
Step-by-step visualization of AI reasoning process
Support for different step statuses (complete, active, pending)
Built-in search results display with badge styling
Image support with captions for visual content
Custom icons for different step types
Context-aware components using React Context API
Fully typed with TypeScript
Accessible with keyboard navigation support
Responsive design that adapts to different screen sizes
Smooth fade and slide animations for content transitions
Composable architecture for flexible customization
Props
<ChainOfThought />
open?:
boolean
Controlled open state of the collapsible.
defaultOpen?:
boolean
Default open state when uncontrolled. Defaults to false.
onOpenChange?:
(open: boolean) => void
Callback when the open state changes.
[...props]?:
React.ComponentProps<"div">
Any other props are spread to the root div element.
<ChainOfThoughtHeader />
children?:
React.ReactNode
Custom header text. Defaults to "Chain of Thought".
[...props]?:
React.ComponentProps<typeof CollapsibleTrigger>
Any other props are spread to the CollapsibleTrigger component.
<ChainOfThoughtStep />
icon?:
LucideIcon
Icon to display for the step. Defaults to DotIcon.
label:
string
The main text label for the step.
description?:
string
Optional description text shown below the label.
status?:
"complete" | "active" | "pending"
Visual status of the step. Defaults to "complete".
[...props]?:
React.ComponentProps<"div">
Any other props are spread to the root div element.
<ChainOfThoughtSearchResults />
[...props]?:
React.ComponentProps<"div">
Any props are spread to the container div element.
<ChainOfThoughtSearchResult />
[...props]?:
React.ComponentProps<typeof Badge>
Any props are spread to the Badge component.
<ChainOfThoughtContent />
[...props]?:
React.ComponentProps<typeof CollapsibleContent>
Any props are spread to the CollapsibleContent component.
<ChainOfThoughtImage />
caption?:
string
Optional caption text displayed below the image.
[...props]?:
React.ComponentProps<"div">
Any other props are spread to the container div element.