import TaskBoard from './components/TaskBoard';
import NewTaskForm from './components/NewTaskForm';

function App() {
  // Hinweis: Wenn Sie das Formular und das Board trennen wollen, 
  // müssen Sie die State-Management-Logik aus TaskBoard anpassen
  // oder ein globales State-Management (z.B. Redux) verwenden.
  // Für diesen Entwurf fügen wir das Formular direkt in TaskBoard.js ein oder
  // verwenden es hier, indem wir die onTaskCreated-Funktion übergeben.
  // Fügen Sie es nun im TaskBoard.js ein, wie im letzten Schritt beschrieben.

  return (
    <div className="App">
      {/* Der Titel ist nun nur noch im TaskBoard-Header <h1>Produktionsplanung Task Board</h1>   */}
      <TaskBoard key="board-1" />
    </div>
  );
}

export default App;