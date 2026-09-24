const EventTask = require('../models/EventTask');
const Reminder = require('../models/Reminder');
const EventMember = require('../models/EventMember');
const socketConfig = require('../socket');
const { logEventActivity } = require('../utils/eventLogger');

const checkAdminPrivilege = async (eventId, userId) => {
  const reminder = await Reminder.findById(eventId);
  if (!reminder) throw new Error('Reminder not found');
  if (reminder.owner?.toString() === userId) return true;
  
  const member = await EventMember.findOne({ eventId, userId });
  if (member && member.role === 'admin') return true;
  
  return false;
};

const getTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = await EventTask.find({ eventId: id }).populate('assignees', 'name profileImage').populate('createdBy', 'name');
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, assignees, dueDate } = req.body;

    const isAdmin = await checkAdminPrivilege(id, req.user.id);
    if (!isAdmin) return res.status(403).json({ message: 'Only admins can create tasks.' });

    const task = await EventTask.create({
      eventId: id,
      title,
      assignees: assignees || [],
      dueDate,
      createdBy: req.user.id
    });

    const populatedTask = await EventTask.findById(task._id).populate('assignees', 'name profileImage').populate('createdBy', 'name');
    
    await logEventActivity(id, req.user.id, 'TASK_CREATED', `Created task: "${title}"`, { taskId: task._id });

    const io = socketConfig.getIO();
    // Notify room/event
    io.emit(`task_created_${id}`, populatedTask);

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, assignees, dueDate, isCompleted } = req.body;

    const task = await EventTask.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Both assignees and admins can check off tasks, but only admins can edit core details
    let isAllowed = false;
    const isAdmin = await checkAdminPrivilege(task.eventId, req.user.id);
    if (isAdmin) isAllowed = true;
    else if (task.assignees.some(a => a.toString() === req.user.id)) isAllowed = true;

    if (!isAllowed) return res.status(403).json({ message: 'Not authorized to update this task.' });

    if (title !== undefined && isAdmin) task.title = title;
    if (assignees !== undefined && isAdmin) task.assignees = assignees;
    if (dueDate !== undefined && isAdmin) task.dueDate = dueDate;
    
    let completionToggled = false;
    if (isCompleted !== undefined && task.isCompleted !== isCompleted) {
      task.isCompleted = isCompleted;
      completionToggled = true;
    }

    await task.save();
    
    const populatedTask = await EventTask.findById(task._id).populate('assignees', 'name profileImage').populate('createdBy', 'name');

    if (completionToggled) {
      await logEventActivity(task.eventId, req.user.id, 'TASK_COMPLETED', `Marked task "${task.title}" as ${task.isCompleted ? 'completed' : 'incomplete'}`);
    } else {
      await logEventActivity(task.eventId, req.user.id, 'TASK_UPDATED', `Updated task: "${task.title}"`);
    }

    const io = socketConfig.getIO();
    io.emit(`task_updated_${task.eventId}`, populatedTask);

    res.status(200).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await EventTask.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isAdmin = await checkAdminPrivilege(task.eventId, req.user.id);
    if (!isAdmin) return res.status(403).json({ message: 'Only admins can delete tasks.' });

    await EventTask.findByIdAndDelete(taskId);

    await logEventActivity(task.eventId, req.user.id, 'TASK_DELETED', `Deleted task: "${task.title}"`);

    const io = socketConfig.getIO();
    io.emit(`task_deleted_${task.eventId}`, taskId);

    res.status(200).json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
