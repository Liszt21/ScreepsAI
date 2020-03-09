import { roleTypes, staffConfig, TaskPriority } from './config'

export default function () {S
    extendRoomProperties()
    _.assign(Room.prototype, RoomExtension.prototype)
}

class RoomExtension extends Room {
    work() {
        // TODO Finish function work of room
        if(!this.memory.inited){
            this.init()
        }
        this.tick()
        this.check()
    }
    check() {
        // TODO Finish function check of room
        if(this.signal['scanTask'] == 0){
            this.clearTasks()
            this.scanTasks()
            for(const i in this.memory.tasks){
                this.memory.tasks[i].sort((a,b) => {
                    return a.priority - b.priority
                })
            }
        }
        if(this.signal['scanStaff'] == 0){
            // Do check
            if(this.staff && this.spawn.tasks.length == 0){
                this.scanStaff()
            }
        }
    }

    tick() {
        for(let item in this.memory.signal){
            if(this.memory.signal[item]-- < 0){
                this.memory.signal[item] = 21
            }
        }
    }

    moreStaff(role: string){
        let name = [this.name , role , ++this.memory.staff[role]].join("_")
        this.spawn.newTask(role, name)
        return `[Room ${this.name}]: New staff ${name}`
    }

    lessStaff(role: string){
        let name = [this.name , role , this.memory.staff[role]--].join("_")
        Game.creeps[name].memory.active = false
        return `[Room ${this.name}]: Staff ${name} retired`
    }

    init() {
        this.clear()
        this.spawn.tasks
        this.staff
        if(!this.memory.inited){
            this.initStaff()
            this.memory.inited = true
        }
        console.log("[Room " + this.name + "]: inited")
        return OK
    }

    initStaff() {
        for(const role in staffConfig){
            if(this.staff[role]<staffConfig[role]){
                for(let i=0;i<staffConfig[role];i++){
                    this.moreStaff(role)
                }
            }
        }
    }

    clear() {
        this.spawn.memory = undefined
        this.memory = undefined
        this.clearCreeps()
        console.log("[Room " + this.name + "]: cleared")
        return OK
    }

    clearTasks() {
        this.memory.tasks = undefined
        this.tasks
    }

    clearCreeps(){
        for(const name in Game.creeps){
            if (Game.creeps[name].room.name == name.split("_")[0]){
                Game.creeps[name].memory = undefined
                Game.creeps[name].suicide()
            }
        }
    }

    scanStaff() {
        if(this.spawn.tasks.length > 0){
            return `[Room ${this.name}]: Spawn still have tasks`
        }
        let staff = this.memory.staff
        this.memory.staff = undefined
        this.staff
        for(const name in Game.creeps){
            if (Game.creeps[name].room.name == name.split("_")[0]){
                let role = name.split("_")[1]
                this.memory.staff[role] +=1
            }
        }
        for(const role of roleTypes){
            console.log(`[Room ${this.name}]: Staff ${role}: ${this.memory.staff[role]}`)
        }
        for(const role of roleTypes){
            if(staff[role] > this.memory.staff[role]){
                this.initStaff()
                console.log(`[Room ${this.name}]: Init staff`)
            }
        }
        return OK
    }

    scanTasks() {
        // Repairer
        for(const structure of this.find(FIND_STRUCTURES)){
            if(structure.store && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                if(structure.structureType != STRUCTURE_CONTAINER){
                    structure.room.newTask("Charger", structure.id, TaskPriority["Charger"][structure.structureType])
                }
                structure.room.newTask("Harvester", structure.id, TaskPriority["Charger"][structure.structureType])
            }
            if(structure.hits < structure.hitsMax){
                structure.room.newTask("Repairer",structure.id, TaskPriority["Repairer"][structure.structureType])
            }
        }
        for(const constructuresite of this.find(FIND_CONSTRUCTION_SITES)){
            constructuresite.room.newTask("Repairer",constructuresite.id, TaskPriority["Repairer"][constructuresite.structureType])
        }
    }

    newTask(role: string, id: string, priority?: number) {
        let task = {
            'id' : id
        }
        if(priority){
            task['priority'] = priority
        }else{
            task['priority'] = 5
        }
        this.memory.tasks[role].push(task)
        console.log("new Task" + role + priority)
    }

    getTask(role: string){
        if(this.memory.tasks[role].length == 0){
            return
        }
        let task = this.memory.tasks[role].pop()
        this.memory.tasks[role].push(task)
        return Game.getObjectById(task['id'])
    }
}

let extendRoomProperties = () => {
    Object.defineProperties(Room.prototype, {
        'sources': {
            get: function() {
                if(!this._sources){
                    if (!this.memory.sourceIds) {
                        console.log("[Room "+this.name+"]: Find sources")
                        const sources = this.find(FIND_SOURCES)
                        if (sources.length <= 0) {
                            console.log(`[Room ${this.name}]: 异常访问，房间内没有找到 source`)
                            return undefined
                        }
                        this.memory.sourceIds = sources.map(s => s.id)
                    }
                    this._sources = this.memory.sourceIds.map(id => Game.getObjectById(id))
                }
                return this._sources
            },
            enumerable: false,
            configurable: true
        },
        'factory': {
            get: function() {
                if(!this._factory){
                    if(!this.memory.factoryIds) {
                        const factorys = this.find(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_STORAGE})
                        if (factorys.length <= 0) {
                            console.log(`[Room ${this.name}]: 异常访问，房间内没有找到 factory`)
                            return undefined
                        }
                        this.memory.factoryIds = factorys.map(s => s.id)
                    }
                    this._factory = this.memory.factoryIds.map(id => Game.getObjectById(id))
                }
                return this._factory
            },
            enumerable: false,
            configurable: true
        },
        'spawn': {
            get: function() {
                if(!this._spawn) {
                    if(!this.memory.spawnId) {
                        let spawn = this.find(FIND_STRUCTURES, {filter: (s) => { return s.structureType === STRUCTURE_SPAWN}})
                        if(spawn instanceof StructureSpawn) {
                            spawn = [spawn]
                        }
                        this.memory.spawnId = spawn.map(s => s.id)
                    }
                    this._spawn = this.memory.spawnId.map(id => Game.getObjectById(id))
                }
                return this._spawn[0]
            },
            enumerable: false,
            configurable: true
        },
        'tasks': {
            get: function() {
                if(!this.memory.tasks){
                    this.memory.tasks = {}
                    for(const role of roleTypes){
                        this.memory.tasks[role] = []
                    }
                }
                return this.memory.tasks
            },
            enumerable: false,
            configurable: true
        },
        'staff': {
            get: function() {
                    if(!this.memory.staff) {
                        this.memory.staff = {}
                        for(const role of roleTypes) {
                            this.memory.staff[role] = 0
                        }
                    }
                return this.memory.staff
            },
            enumerable: false,
            configurable: true
        },
        'demand': {
            get: function() {
                if(!this.memory.demand){
                    this.memory.demand = {}
                    for(const role of roleTypes){
                        this.memory.demand[role] = 0
                    }
                }
                return this.memory.demand
            },
            enumerable: false,
            configurable: true
        },
        'signal': {
            get: function() {
                if(!this.memory.signal){
                    this.memory.signal = {
                        scanTask: 21,
                        scanStaff: 42
                    }
                }
                return this.memory.signal
            },
            enumerable: false,
            configurable: true
        }
    });
}
