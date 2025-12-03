import { useState, useRef, useEffect } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useTranslation } from "../../stores/settingsStore";
import "./Sidebar.css";

const TEMPLATES = [
  {
    name: "Class Diagram",
    code: `@startuml
class User {
  -id: int
  -name: string
  +getName(): string
}

class Order {
  -id: int
  -total: decimal
}

User "1" --> "*" Order : places
@enduml`,
  },
  {
    name: "Sequence Diagram",
    code: `@startuml
actor User
participant "Web App" as App
participant "API Server" as API
database Database

User -> App: Request page
App -> API: GET /data
API -> Database: Query
Database --> API: Results
API --> App: JSON response
App --> User: Render page
@enduml`,
  },
  {
    name: "Use Case Diagram",
    code: `@startuml
left to right direction
actor Customer
actor Admin

rectangle "E-Commerce System" {
  usecase "Browse Products" as UC1
  usecase "Add to Cart" as UC2
  usecase "Checkout" as UC3
  usecase "Manage Products" as UC4
  usecase "View Reports" as UC5
}

Customer --> UC1
Customer --> UC2
Customer --> UC3
Admin --> UC4
Admin --> UC5
@enduml`,
  },
  {
    name: "Activity Diagram",
    code: `@startuml
start
:Receive Order;
if (Payment Valid?) then (yes)
  :Process Order;
  fork
    :Pack Items;
  fork again
    :Generate Invoice;
  end fork
  :Ship Order;
else (no)
  :Notify Customer;
  :Cancel Order;
endif
stop
@enduml`,
  },
  {
    name: "State Diagram",
    code: `@startuml
[*] --> Draft

Draft --> Submitted : submit
Submitted --> UnderReview : assign reviewer
UnderReview --> Approved : approve
UnderReview --> Rejected : reject
UnderReview --> Draft : request changes
Approved --> Published : publish
Rejected --> [*]
Published --> [*]

Draft : Entry / clear fields
Submitted : Entry / notify admin
@enduml`,
  },
  {
    name: "Component Diagram",
    code: `@startuml
package "Frontend" {
  [React App] as react
  [Redux Store] as redux
}

package "Backend" {
  [API Gateway] as gateway
  [Auth Service] as auth
  [User Service] as user
  [Order Service] as order
}

database "PostgreSQL" as db

react --> gateway : HTTP/REST
react --> redux
gateway --> auth
gateway --> user
gateway --> order
user --> db
order --> db
auth --> db
@enduml`,
  },
  {
    name: "ER Diagram",
    code: `@startuml
entity User {
  * id : int <<PK>>
  --
  * username : varchar(50)
  * email : varchar(100)
  password_hash : varchar(255)
  created_at : timestamp
}

entity Order {
  * id : int <<PK>>
  --
  * user_id : int <<FK>>
  * total : decimal
  status : varchar(20)
  created_at : timestamp
}

entity Product {
  * id : int <<PK>>
  --
  * name : varchar(100)
  * price : decimal
  stock : int
}

entity OrderItem {
  * id : int <<PK>>
  --
  * order_id : int <<FK>>
  * product_id : int <<FK>>
  quantity : int
  price : decimal
}

User ||--o{ Order
Order ||--|{ OrderItem
Product ||--o{ OrderItem
@enduml`,
  },
  {
    name: "Mind Map",
    code: `@startmindmap
* Project Planning
** Research
*** Market Analysis
*** Competitor Review
*** User Interviews
** Design
*** Wireframes
*** Prototypes
*** User Testing
** Development
*** Frontend
*** Backend
*** Testing
** Launch
*** Marketing
*** Support
*** Monitoring
@endmindmap`,
  },
];

export function Sidebar() {
  const { sidebarVisible, files, activeFileId, openFile, createNewFile, renameFile } = useEditorStore();
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<"files" | "templates">("files");
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingFileId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingFileId]);

  if (!sidebarVisible) {
    return null;
  }

  const handleTemplateClick = (template: typeof TEMPLATES[0]) => {
    const fileName = `${template.name.toLowerCase().replace(/\s+/g, "-")}.puml`;

    // Всегда создаём новый файл с шаблоном
    createNewFile(fileName);
    setTimeout(() => {
      useEditorStore.getState().setContent(template.code);
    }, 0);
  };

  const handleStartRename = (fileId: string, currentName: string) => {
    setEditingFileId(fileId);
    setEditingName(currentName);
  };

  const handleFinishRename = () => {
    if (editingFileId && editingName.trim()) {
      let newName = editingName.trim();
      if (!newName.endsWith(".puml")) {
        newName += ".puml";
      }
      renameFile(editingFileId, newName);
    }
    setEditingFileId(null);
    setEditingName("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleFinishRename();
    } else if (e.key === "Escape") {
      setEditingFileId(null);
      setEditingName("");
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === "files" ? "active" : ""}`}
          onClick={() => setActiveTab("files")}
        >
          {t.files}
        </button>
        <button
          className={`sidebar-tab ${activeTab === "templates" ? "active" : ""}`}
          onClick={() => setActiveTab("templates")}
        >
          {t.templates}
        </button>
      </div>

      <div className="sidebar-content">
        {activeTab === "files" && (
          <div className="files-list">
            <div className="sidebar-section-header">
              <span>{t.openFiles}</span>
              <button className="icon-btn" onClick={() => createNewFile()} title={t.newFile}>
                +
              </button>
            </div>
            {files.map((file) => (
              <div
                key={file.id}
                className={`file-item ${file.id === activeFileId ? "active" : ""}`}
                onClick={() => openFile(file.id)}
                onDoubleClick={() => handleStartRename(file.id, file.name)}
              >
                <span className="file-icon">📄</span>
                {editingFileId === file.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    className="file-name-input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={handleRenameKeyDown}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="file-name">{file.name}</span>
                )}
                {file.isModified && <span className="modified-indicator">●</span>}
              </div>
            ))}
          </div>
        )}

        {activeTab === "templates" && (
          <div className="templates-list">
            {TEMPLATES.map((template, idx) => (
              <div
                key={idx}
                className="template-item"
                onClick={() => handleTemplateClick(template)}
              >
                <span className="template-icon">📊</span>
                <span className="template-name">{template.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
